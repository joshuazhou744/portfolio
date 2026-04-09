import asyncio
import io
import logging
import os
import random
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any

import spotipy
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from googleapiclient.discovery import build
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from pydantic import BaseModel
from spotipy.oauth2 import SpotifyClientCredentials
from ytmusicapi import YTMusic

from app.audio import download_audio_sync, pick_youtube_match

# load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Env to expose or hide docs
ENV = os.getenv("ENV", "dev")
IS_PROD = ENV == "prod"

app = FastAPI(
    title="Portfolio Music API",
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url=None if IS_PROD else "/openapi.json",
)

# get the frontend URL from environment variable or use localhost for development
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
PREVIEW_URL = os.getenv("PREVIEW_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, PREVIEW_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.portfolio

# GridFS setup for audio files
fs = AsyncIOMotorGridFSBucket(client.portfolio)

# Lazy-initialized API clients (see get_*_client below)
youtube = None
spotify = None
ytmusic = None


def get_youtube_client():
    global youtube
    if youtube is None:
        api_key = os.getenv("YOUTUBE_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="YouTube API key not configured")
        try:
            youtube = build("youtube", "v3", developerKey=api_key)
        except Exception as e:
            logger.error(f"Failed to initialize YouTube client: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to initialize YouTube client")
    return youtube


def get_spotify_client():
    global spotify
    if spotify is None:
        client_id = os.getenv("SPOTIFY_CLIENT_ID")
        client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        if not client_id or not client_secret:
            raise HTTPException(status_code=500, detail="Spotify credentials not configured")
        try:
            client_credentials_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)
            spotify = spotipy.Spotify(client_credentials_manager=client_credentials_manager)
        except Exception as e:
            logger.error(f"Failed to initialize Spotify client: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to initialize Spotify client")
    return spotify


def get_ytmusic_client():
    global ytmusic
    if ytmusic is None:
        try:
            ytmusic = YTMusic()
        except Exception as e:
            logger.error(f"Failed to initialize YTMusic client: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to initialize YTMusic client")
    return ytmusic


# helper function to check if a collection exists
async def check_collection_exists(collection_name: str) -> tuple[bool, str]:
    try:
        collections = await db.list_collection_names()
        if collection_name not in collections:
            return False, f"Collection '{collection_name}' does not exist"
        return True, ""
    except Exception as e:
        return False, f"Error checking collection: {str(e)}"


def _strip_mongo_id(doc: dict) -> dict:
    """Convert Mongo's _id ObjectId field to a string `id` field in-place."""
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


async def _fetch_by_object_id(collection, id_str: str, not_found_msg: str) -> dict:
    """Validate an ObjectId string, fetch the document, and raise standard HTTP errors."""
    if not ObjectId.is_valid(id_str):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    obj = await collection.find_one({"_id": ObjectId(id_str)})
    if not obj:
        raise HTTPException(status_code=404, detail=not_found_msg)
    return obj


def _project_sort_key(project: dict) -> tuple:
    """Sort key for /projects: explicit `level` ascending, then year descending."""
    level = project.get("level")
    # None means no priority; push to end by using large sentinel
    return (level if level is not None else float("inf"), -(project.get("year") or 0))


_MONTH_MAP = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12,
}


def _parse_experience_date(date_str: str) -> tuple[int, int]:
    """Parse 'Month YYYY' or 'Present' into a sortable (year, month) tuple."""
    if date_str == "Present":
        # Give "Present" the highest priority (most recent)
        return (9999, 12)
    try:
        month_str, year_str = date_str.split()
        return (int(year_str), _MONTH_MAP.get(month_str, 1))
    except (ValueError, KeyError):
        # If parsing fails, put at the end
        return (0, 0)


class Song(BaseModel):
    title: str
    artist: str
    cover_image_url: str
    audio_file_id: str | None = None
    spotify_id: str | None = None


class SongResponse(Song):
    id: str

    class Config:
        from_attributes = True


class SpotifyTrack(BaseModel):
    title: str
    artist: str
    cover_image_url: str
    spotify_id: str


class ResumeMetadata(BaseModel):
    filename: str
    file_id: str
    upload_date: datetime = datetime.utcnow()
    content_type: str


class Project(BaseModel):
    name: str
    description: str
    technologies: list[str]
    year: int
    level: int | None = None
    github: str | None = None
    demo_url: str | None = None


class ProjectResponse(Project):
    id: str

    class Config:
        from_attributes = True


class Experience(BaseModel):
    title: str
    company: str
    location: str
    start_date: str
    end_date: str
    description: list[str]


class ExperienceResponse(Experience):
    id: str

    class Config:
        from_attributes = True


class ContactInfo(BaseModel):
    id: str | None = None
    email: str
    phone: str
    linkedin: str
    github: str


@app.get("/health")
async def health_check():
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "unhealthy", "error": str(e)})


@app.get("/songs/{collection_name}", response_model=list[SongResponse])
async def get_songs(collection_name: str, noshuffle: bool = False):
    try:
        exists, error_message = await check_collection_exists(collection_name)
        if not exists:
            raise HTTPException(status_code=404, detail=error_message)

        songs = []
        cursor = db[collection_name].find()
        async for song in cursor:
            songs.append(_strip_mongo_id(song))

        if not noshuffle:
            random.shuffle(songs)

        return songs
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch songs: {str(e)}")


@app.get("/songs/{collection_name}/{song_id}", response_model=SongResponse)
async def get_song(collection_name: str, song_id: str):
    try:
        exists, error_message = await check_collection_exists(collection_name)
        if not exists:
            raise HTTPException(status_code=404, detail=error_message)

        song = await _fetch_by_object_id(db[collection_name], song_id, "Song not found")
        return _strip_mongo_id(song)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch song: {str(e)}")


@app.get("/songs/{collection_name}/{song_id}/audio")
async def get_song_audio(collection_name: str, song_id: str):
    try:
        exists, error_message = await check_collection_exists(collection_name)
        if not exists:
            raise HTTPException(status_code=404, detail=error_message)

        song = await _fetch_by_object_id(db[collection_name], song_id, "Song not found")
        if not song.get("audio_file_id"):
            raise HTTPException(status_code=404, detail="Song has no audio_file_id")

        try:
            audio_file_id = ObjectId(song["audio_file_id"])
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid audio file id on song")

        try:
            grid_out = await fs.open_download_stream(audio_file_id)
        except Exception as e:
            logger.error(f"Failed to open GridFS stream for {audio_file_id}: {e}", exc_info=True)
            raise HTTPException(status_code=404, detail="Audio file not found")

        media_type = getattr(grid_out, "content_type", None) or "application/octet-stream"
        filename = getattr(grid_out, "filename", None) or f"{song['title']}.mp3"

        try:
            # Ensure Content-Disposition header is ASCII-safe to avoid latin-1 encoding issues
            headers = {}
            if filename:
                try:
                    ascii_filename = filename.encode("latin-1").decode("latin-1")
                    headers["Content-Disposition"] = f'attachment; filename="{ascii_filename}"'
                except Exception:
                    headers["Content-Disposition"] = f"attachment; filename*=UTF-8''{urllib.parse.quote(filename)}"
            else:
                headers["Content-Disposition"] = 'attachment; filename="audio.mp3"'

            return StreamingResponse(grid_out, media_type=media_type, headers=headers)
        except Exception as e:
            logger.error(f"Failed to stream GridFS file {audio_file_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to stream audio file")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch song audio: {str(e)}")


@app.delete("/songs/{collection_name}/{song_id}")
async def delete_song(collection_name: str, song_id: str):
    try:
        exists, error_message = await check_collection_exists(collection_name)
        if not exists:
            raise HTTPException(status_code=404, detail=error_message)

        song = await _fetch_by_object_id(db[collection_name], song_id, "Song not found")

        if song.get("audio_file_id"):
            await fs.delete(ObjectId(song["audio_file_id"]))

        await db[collection_name].delete_one({"_id": ObjectId(song_id)})
        return {"message": "Song deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete song: {str(e)}")


@app.get("/spotify/playlist/{playlist_id}", response_model=list[SpotifyTrack])
async def get_spotify_playlist(playlist_id: str, collection: str = "study"):
    try:
        # Use the get_spotify_client() function instead of global variable
        spotify_client = get_spotify_client()
        results = spotify_client.playlist_tracks(playlist_id)
        tracks = []

        for item in results["items"]:
            track = item["track"]
            if track:
                # check for duplicates in the specified collection
                existing_song = await db[collection].find_one({"spotify_id": track["id"]})
                if existing_song:
                    continue

                # get the first artist
                artist = track["artists"][0]["name"]

                # get the album cover image
                cover_image = track["album"]["images"][0]["url"] if track["album"]["images"] else None

                tracks.append(
                    SpotifyTrack(
                        title=track["name"], artist=artist, cover_image_url=cover_image, spotify_id=track["id"]
                    )
                )

        return tracks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Spotify playlist: {str(e)}")


@app.post("/songs/{collection_name}/{spotify_id}/audio")
async def attach_youtube_audio(
    collection_name: str, spotify_id: str, youtube_url: str = Query(..., description="YouTube URL for the audio")
):
    try:
        exists, error_message = await check_collection_exists(collection_name)
        if not exists:
            raise HTTPException(status_code=404, detail=error_message)

        song = await db[collection_name].find_one({"spotify_id": spotify_id})
        if not song:
            raise HTTPException(status_code=404, detail="Song not found in collection")

        # check if song already has audio
        if song.get("audio_file_id"):
            raise HTTPException(status_code=400, detail="Song already has audio attached")

        executor = ThreadPoolExecutor()

        try:
            # run the download with timeout
            try:
                audio_data = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(executor, download_audio_sync, youtube_url), timeout=60.0
                )
            except TimeoutError:
                raise HTTPException(status_code=400, detail="Download timed out. Please try again.")

            # upload to GridFS
            filename = f"{song['title']}.mp3"
            grid_in = await fs.upload_from_stream(
                filename, io.BytesIO(audio_data), metadata={"contentType": "audio/mp3"}
            )

            # update song document with audio file ID
            await db[collection_name].update_one({"_id": song["_id"]}, {"$set": {"audio_file_id": str(grid_in)}})

            return {"message": "Audio attached successfully"}

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to download YouTube audio: {str(e)}")
        finally:
            executor.shutdown()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.post("/songs/collection/{collection_name}")
async def add_songs_to_collection(collection_name: str, songs: list[dict[str, Any]]):
    try:
        result = await db[collection_name].insert_many(songs)

        # convert ObjectIds to strings for JSON serialization
        inserted_ids = [str(id) for id in result.inserted_ids]

        return {
            "message": f"Added {len(inserted_ids)} songs to collection '{collection_name}'",
            "collection_name": collection_name,
            "inserted_count": len(inserted_ids),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add songs to collection: {str(e)}")


@app.post("/songs/{collection_name}/process-missing")
async def process_songs_without_audio(collection_name: str):
    try:
        exists, error_message = await check_collection_exists(collection_name)
        if not exists:
            raise HTTPException(status_code=404, detail=error_message)

        # find all songs without youtube_link or audio_file_id
        cursor = db[collection_name].find(
            {"$or": [{"youtube_link": {"$exists": False}}, {"audio_file_id": {"$exists": False}}]}
        )

        processed_count = 0
        failed_songs = []

        async for song in cursor:
            try:
                # search for the song on YouTube Music
                search_query = f"{song['title']} {song['artist']}"

                # call YTMusic API to search for the video
                ytmusic_client = get_ytmusic_client()
                search_results = ytmusic_client.search(search_query, filter="songs")

                # check if we got any results
                if not search_results:
                    failed_songs.append(
                        {"title": song["title"], "artist": song["artist"], "reason": "No YouTube results found"}
                    )
                    continue

                # pick the first result whose title AND artist are close enough;
                # otherwise skip rather than blindly downloading the wrong upload
                match = pick_youtube_match(song["title"], song["artist"], search_results)
                if not match:
                    top = search_results[0]
                    top_title = top.get("title") or "?"
                    top_artist = " ".join(a.get("name", "") for a in (top.get("artists") or [])) or "?"
                    failed_songs.append(
                        {
                            "title": song["title"],
                            "artist": song["artist"],
                            "reason": f"No YouTube title+artist match >=0.7 (top: {top_title!r} by {top_artist!r})",
                        }
                    )
                    continue
                youtube_url = f"https://www.youtube.com/watch?v={match['videoId']}"

                # download the audio using yt-dlp
                executor = ThreadPoolExecutor()

                try:
                    # download with timeout
                    audio_data = await asyncio.wait_for(
                        asyncio.get_event_loop().run_in_executor(executor, download_audio_sync, youtube_url),
                        timeout=60.0,
                    )

                    # upload to GridFS
                    filename = f"{song['title']}.mp3"
                    grid_in = await fs.upload_from_stream(
                        filename, io.BytesIO(audio_data), metadata={"contentType": "audio/mp3"}
                    )

                    # update song with youtube_link and audio_file_id
                    await db[collection_name].update_one(
                        {"_id": song["_id"]}, {"$set": {"youtube_link": youtube_url, "audio_file_id": str(grid_in)}}
                    )

                    processed_count += 1

                except TimeoutError:
                    failed_songs.append(
                        {"title": song["title"], "artist": song["artist"], "reason": "Download timeout"}
                    )
                except Exception as e:
                    failed_songs.append({"title": song["title"], "artist": song["artist"], "reason": str(e)})
                finally:
                    executor.shutdown()

            except Exception as e:
                failed_songs.append({"title": song["title"], "artist": song["artist"], "reason": str(e)})

        return {
            "message": f"Processed {processed_count} songs",
            "processed_count": processed_count,
            "failed_songs": failed_songs,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process songs: {str(e)}")


@app.post("/resume/upload", response_model=dict[str, str])
async def upload_resume(file: UploadFile = File(...)):
    try:
        if not file.content_type == "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        content = await file.read()

        grid_in = await fs.upload_from_stream(
            file.filename, io.BytesIO(content), metadata={"contentType": file.content_type}
        )

        resume_data = ResumeMetadata(filename=file.filename, file_id=str(grid_in), content_type=file.content_type)

        await db.resume.delete_many({})

        await db.resume.insert_one(resume_data.dict())

        return {"message": "Resume uploaded successfully", "file_id": str(grid_in)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload resume: {str(e)}")


@app.get("/resume", response_model=ResumeMetadata | None)
async def get_resume():
    try:
        resume = await db.resume.find_one()
        if not resume:
            raise HTTPException(status_code=404, detail="No resume found")

        return _strip_mongo_id(resume)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch resume: {str(e)}")


@app.get("/resume/view")
async def view_resume():
    try:
        resume = await db.resume.find_one()
        if not resume:
            raise HTTPException(status_code=404, detail="No resume found")

        grid_out = await fs.open_download_stream(ObjectId(resume["file_id"]))

        return StreamingResponse(grid_out, media_type="application/pdf")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to view resume: {str(e)}")


@app.get("/resume/download")
async def download_resume():
    try:
        resume = await db.resume.find_one()
        if not resume:
            raise HTTPException(status_code=404, detail="No resume found")

        grid_out = await fs.open_download_stream(ObjectId(resume["file_id"]))

        return StreamingResponse(
            grid_out,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{resume["filename"]}"'},
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download resume: {str(e)}")


@app.get("/contact", response_model=ContactInfo)
async def get_contact():
    try:
        contact = await db.contact.find_one({"_id": "primary"}) or await db.contact.find_one()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact info not found")
        return ContactInfo(**_strip_mongo_id(contact))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch contact info: {str(e)}")


@app.post("/projects", response_model=dict[str, str])
async def add_project(project: Project):
    try:
        project_dict = project.dict()

        result = await db.projects.insert_one(project_dict)

        return {"message": "Project added successfully", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add project: {str(e)}")


@app.post("/projects/bulk", response_model=dict[str, Any])
async def add_projects(projects: list[Project]):
    try:
        project_dicts = [project.dict() for project in projects]

        result = await db.projects.insert_many(project_dicts)

        inserted_ids = [str(id) for id in result.inserted_ids]

        return {"message": f"Added {len(inserted_ids)} projects", "inserted_ids": inserted_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add projects: {str(e)}")


@app.get("/projects", response_model=list[ProjectResponse])
async def get_projects():
    try:
        projects = []
        cursor = db.projects.find()

        async for project in cursor:
            projects.append(_strip_mongo_id(project))

        projects.sort(key=_project_sort_key)
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")


@app.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    try:
        project = await _fetch_by_object_id(db.projects, project_id, "Project not found")
        return _strip_mongo_id(project)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {str(e)}")


@app.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project: Project):
    try:
        await _fetch_by_object_id(db.projects, project_id, "Project not found")

        update_result = await db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": project.dict()})

        if update_result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Project was not updated")

        updated_project = await db.projects.find_one({"_id": ObjectId(project_id)})
        return _strip_mongo_id(updated_project)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update project: {str(e)}")


@app.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    try:
        await _fetch_by_object_id(db.projects, project_id, "Project not found")

        delete_result = await db.projects.delete_one({"_id": ObjectId(project_id)})

        if delete_result.deleted_count == 0:
            raise HTTPException(status_code=400, detail="Project was not deleted")

        return {"message": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")


@app.post("/experiences", response_model=dict[str, str])
async def add_experience(experience: Experience):
    try:
        experience_dict = experience.dict()

        result = await db.experiences.insert_one(experience_dict)

        return {"message": "Experience added successfully", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add experience: {str(e)}")


@app.post("/experiences/bulk", response_model=dict[str, Any])
async def add_experiences(experiences: list[Experience]):
    try:
        experience_dicts = [experience.dict() for experience in experiences]

        result = await db.experiences.insert_many(experience_dicts)

        inserted_ids = [str(id) for id in result.inserted_ids]

        return {"message": f"Added {len(inserted_ids)} experiences", "inserted_ids": inserted_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add experiences: {str(e)}")


@app.get("/experiences", response_model=list[ExperienceResponse])
async def get_experiences():
    try:
        experiences = []
        cursor = db.experiences.find()

        async for experience in cursor:
            experiences.append(_strip_mongo_id(experience))

        # Sort by end_date descending, then by start_date descending
        experiences.sort(
            key=lambda x: (
                _parse_experience_date(x.get("end_date", "Present")),
                _parse_experience_date(x.get("start_date", "")),
            ),
            reverse=True,
        )

        return experiences
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch experiences: {str(e)}")


@app.get("/experiences/{experience_id}", response_model=ExperienceResponse)
async def get_experience(experience_id: str):
    try:
        experience = await _fetch_by_object_id(db.experiences, experience_id, "Experience not found")
        return _strip_mongo_id(experience)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch experience: {str(e)}")


@app.put("/experiences/{experience_id}", response_model=ExperienceResponse)
async def update_experience(experience_id: str, experience: Experience):
    try:
        await _fetch_by_object_id(db.experiences, experience_id, "Experience not found")

        update_result = await db.experiences.update_one({"_id": ObjectId(experience_id)}, {"$set": experience.dict()})

        if update_result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Experience was not updated")

        updated_experience = await db.experiences.find_one({"_id": ObjectId(experience_id)})
        return _strip_mongo_id(updated_experience)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update experience: {str(e)}")


@app.delete("/experiences/{experience_id}")
async def delete_experience(experience_id: str):
    try:
        await _fetch_by_object_id(db.experiences, experience_id, "Experience not found")

        delete_result = await db.experiences.delete_one({"_id": ObjectId(experience_id)})

        if delete_result.deleted_count == 0:
            raise HTTPException(status_code=400, detail="Experience was not deleted")

        return {"message": "Experience deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete experience: {str(e)}")
