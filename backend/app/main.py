from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import List, Optional, Dict, Any, Tuple
import os
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import io
from datetime import datetime
import yt_dlp
import asyncio
from concurrent.futures import ThreadPoolExecutor
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from googleapiclient.discovery import build
import urllib.parse
from ytmusicapi import YTMusic
import random
import logging

from pydantic import BaseModel

# load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# YouTube API and ytmusicapi setup
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
ytmusic = YTMusic()

app = FastAPI(title="Portfolio Music API")

# get the frontend URL from environment variable or use localhost for development
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
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

# Spotify setup
spotify = spotipy.Spotify(
    client_credentials_manager=SpotifyClientCredentials(
        client_id=os.getenv("SPOTIFY_CLIENT_ID"),
        client_secret=os.getenv("SPOTIFY_CLIENT_SECRET")
    )
)

# Global variables for API clients
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
            youtube = build('youtube', 'v3', developerKey=api_key)
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
            client_credentials_manager = SpotifyClientCredentials(
                client_id=client_id,
                client_secret=client_secret
            )
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
async def check_collection_exists(collection_name: str) -> Tuple[bool, str]:
    try:
        collections = await db.list_collection_names()
        if collection_name not in collections:
            return False, f"Collection '{collection_name}' does not exist"
        return True, ""
    except Exception as e:
        return False, f"Error checking collection: {str(e)}"

class Song(BaseModel):
    title: str
    artist: str
    cover_image_url: str
    audio_file_id: Optional[str] = None
    spotify_id: Optional[str] = None

class SongResponse(Song):
    id: str

    class Config:
        from_attributes = True

class SpotifyTrack(BaseModel):
    title: str
    artist: str
    cover_image_url: str
    spotify_id: str

class YouTubeSongRequest(BaseModel):
    title: str
    artist: str
    cover_image_url: str
    youtube_url: str

class Playlist(BaseModel):
    name: str
    description: Optional[str] = None
    spotify_id: str
    songs: List[Dict[str, Any]] = []
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

class ResumeMetadata(BaseModel):
    filename: str
    file_id: str
    upload_date: datetime = datetime.utcnow()
    content_type: str

class Project(BaseModel):
    name: str
    description: str
    technologies: List[str]
    year: int
    github: Optional[str] = None
    demo_url: Optional[str] = None

class ProjectResponse(Project):
    id: str

    class Config:
        from_attributes = True

@app.on_event("startup")
async def startup_db_client():
    pass

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.get("/songs/{collection_name}", response_model=List[SongResponse])
async def get_songs(collection_name: str, noshuffle: bool = False):
    try:
        exists, error_message = await check_collection_exists(collection_name)
        if not exists:
            raise HTTPException(status_code=404, detail=error_message)
        
        songs = []
        cursor = db[collection_name].find()
        async for song in cursor:
            song["id"] = str(song["_id"])
            del song["_id"]
            songs.append(song)
        
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
        
        if not ObjectId.is_valid(song_id):
            raise HTTPException(status_code=400, detail="Invalid song ID")
        
        song = await db[collection_name].find_one({"_id": ObjectId(song_id)})
        if not song:
            raise HTTPException(status_code=404, detail="Song not found")
        
        song["id"] = str(song["_id"])
        del song["_id"]
        return song
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
        
        if not ObjectId.is_valid(song_id):
            raise HTTPException(status_code=400, detail="Invalid song ID")
        
        song = await db[collection_name].find_one({"_id": ObjectId(song_id)})
        if not song:
            raise HTTPException(status_code=404, detail="Song not found")
        
        audio_file_id = ObjectId(song["audio_file_id"])
        grid_out = await fs.open_download_stream(audio_file_id)
        
        return StreamingResponse(
            grid_out,
            media_type=grid_out.content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{grid_out.filename}"'
            }
        )
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
        
        if not ObjectId.is_valid(song_id):
            raise HTTPException(status_code=400, detail="Invalid song ID")
        
        song = await db[collection_name].find_one({"_id": ObjectId(song_id)})
        if not song:
            raise HTTPException(status_code=404, detail="Song not found")
        
        if song.get("audio_file_id"):
            await fs.delete(ObjectId(song["audio_file_id"]))
        
        await db[collection_name].delete_one({"_id": ObjectId(song_id)})
        return {"message": "Song deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete song: {str(e)}")

@app.get("/spotify/playlist/{playlist_id}", response_model=List[SpotifyTrack])
async def get_spotify_playlist(playlist_id: str):
    try:    
        results = spotify.playlist_tracks(playlist_id)
        tracks = []
        
        for item in results['items']:
            track = item['track']
            if track:  
                # check for duplicates
                existing_song = await db.playlist.find_one({"spotify_id": track['id']})
                if existing_song:
                    continue
                
                # get the first artist
                artist = track['artists'][0]['name']
                
                # get the album cover image
                cover_image = track['album']['images'][0]['url'] if track['album']['images'] else None
                
                tracks.append(SpotifyTrack(
                    title=track['name'],
                    artist=artist,
                    cover_image_url=cover_image,
                    spotify_id=track['id']
                ))
        
        return tracks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Spotify playlist: {str(e)}")

@app.post("/songs/{collection_name}/{spotify_id}/audio")
async def attach_youtube_audio(
    collection_name: str,
    spotify_id: str,
    youtube_url: str = Query(..., description="YouTube URL for the audio")
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
            # download audio using yt-dlp
            def download_audio():
                try:
                    import tempfile
                    import os
                    
                    # create a temporary directory
                    with tempfile.TemporaryDirectory() as temp_dir:
                        output_template = os.path.join(temp_dir, '%(title)s.%(ext)s')
                        
                        ydl_opts = {
                            'format': 'bestaudio/best',
                            'postprocessors': [{
                                'key': 'FFmpegExtractAudio',
                                'preferredcodec': 'mp3',
                                'preferredquality': '192',
                            }],
                            'outtmpl': output_template,
                            'quiet': True,
                            'no_warnings': True
                        }
                        
                        # download the file
                        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                            ydl.download([youtube_url])
                            
                            # find the downloaded file
                            files = os.listdir(temp_dir)
                            if not files:
                                raise Exception("No audio file was downloaded")
                                
                            audio_file_path = os.path.join(temp_dir, files[0])
                            
                            # read the file
                            with open(audio_file_path, 'rb') as f:
                                return f.read()
                        
                except Exception as e:
                    raise Exception(f"Failed to download audio: {str(e)}")
            
            # run the download with timeout
            try:
                audio_data = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(executor, download_audio),
                    timeout=60.0
                )
            except asyncio.TimeoutError:
                raise HTTPException(
                    status_code=400,
                    detail="Download timed out. Please try again."
                )
            
            # upload to GridFS
            filename = f"{song['title']}.mp3"
            grid_in = await fs.upload_from_stream(
                filename,
                io.BytesIO(audio_data),
                metadata={"contentType": "audio/mp3"}
            )
            
            # update song document with audio file ID
            await db[collection_name].update_one(
                {"_id": song["_id"]},
                {"$set": {"audio_file_id": str(grid_in)}}
            )
            
            return {"message": "Audio attached successfully"}
            
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to download YouTube audio: {str(e)}"
            )
        finally:
            executor.shutdown()
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.post("/songs/collection/{collection_name}")
async def add_songs_to_collection(collection_name: str, songs: List[Dict[str, Any]]):
    try:
        result = await db[collection_name].insert_many(songs)
        
        # convert ObjectIds to strings for JSON serialization
        inserted_ids = [str(id) for id in result.inserted_ids]
        
        return {
            "message": f"Added {len(inserted_ids)} songs to collection '{collection_name}'",
            "collection_name": collection_name,
            "inserted_count": len(inserted_ids)
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
        cursor = db[collection_name].find({
            "$or": [
                {"youtube_link": {"$exists": False}},
                {"audio_file_id": {"$exists": False}}
            ]
        })
        
        processed_count = 0
        failed_songs = []
        
        async for song in cursor:
            try:
                # search for the song on YouTube Music
                search_query = f"{song['title']} {song['artist']}"
                
                # call YTMusic API to search for the video
                search_results = ytmusic.search(search_query, filter='songs')
                
                # check if we got any results
                if not search_results:
                    failed_songs.append({
                        "title": song['title'],
                        "artist": song['artist'],
                        "reason": "No YouTube results found"
                    })
                    continue
                
                # get the first result
                first_result = search_results[0]
                print(first_result)
                youtube_id = first_result['videoId']
                youtube_url = f"https://www.youtube.com/watch?v={youtube_id}"
                
                # download the audio using yt-dlp
                executor = ThreadPoolExecutor()
                
                try:
                    def download_audio():
                        try:
                            import tempfile
                            import os
                            
                            with tempfile.TemporaryDirectory() as temp_dir:
                                output_template = os.path.join(temp_dir, '%(title)s.%(ext)s')
                                
                                ydl_opts = {
                                    'format': 'bestaudio/best',
                                    'postprocessors': [{
                                        'key': 'FFmpegExtractAudio',
                                        'preferredcodec': 'mp3',
                                        'preferredquality': '192',
                                    }],
                                    'outtmpl': output_template,
                                    'quiet': True,
                                    'no_warnings': True
                                }
                                
                                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                                    ydl.download([youtube_url])
                                    
                                    files = os.listdir(temp_dir)
                                    if not files:
                                        raise Exception("No audio file was downloaded")
                                    
                                    audio_file_path = os.path.join(temp_dir, files[0])
                                    
                                    with open(audio_file_path, 'rb') as f:
                                        return f.read()
                                    
                        except Exception as e:
                            raise Exception(f"Failed to download audio: {str(e)}")
                    
                    # download with timeout
                    audio_data = await asyncio.wait_for(
                        asyncio.get_event_loop().run_in_executor(executor, download_audio),
                        timeout=60.0
                    )
                    
                    # upload to GridFS
                    filename = f"{song['title']}.mp3"
                    grid_in = await fs.upload_from_stream(
                        filename,
                        io.BytesIO(audio_data),
                        metadata={"contentType": "audio/mp3"}
                    )
                    
                    # update song with youtube_link and audio_file_id
                    await db[collection_name].update_one(
                        {"_id": song["_id"]},
                        {"$set": {
                            "youtube_link": youtube_url,
                            "audio_file_id": str(grid_in)
                        }}
                    )
                    
                    processed_count += 1
                    
                except asyncio.TimeoutError:
                    failed_songs.append({
                        "title": song['title'],
                        "artist": song['artist'],
                        "reason": "Download timeout"
                    })
                except Exception as e:
                    failed_songs.append({
                        "title": song['title'],
                        "artist": song['artist'],
                        "reason": str(e)
                    })
                finally:
                    executor.shutdown()
                
            except Exception as e:
                failed_songs.append({
                    "title": song['title'],
                    "artist": song['artist'],
                    "reason": str(e)
                })
        
        return {
            "message": f"Processed {processed_count} songs",
            "processed_count": processed_count,
            "failed_songs": failed_songs
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process songs: {str(e)}")

@app.post("/resume/upload", response_model=Dict[str, str])
async def upload_resume(file: UploadFile = File(...)):
    try:
        if not file.content_type == "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        content = await file.read()

        grid_in = await fs.upload_from_stream(
            file.filename,
            io.BytesIO(content),
            metadata={"contentType": file.content_type}
        )

        resume_data = ResumeMetadata(
            filename=file.filename,
            file_id=str(grid_in),
            content_type=file.content_type
        )

        await db.resume.delete_many({})

        await db.resume.insert_one(resume_data.dict())

        return {"message": "Resume uploaded successfully", "file_id": str(grid_in)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload resume: {str(e)}")

@app.get("/resume", response_model=Optional[ResumeMetadata])
async def get_resume():
    try:
        resume = await db.resume.find_one()
        if not resume:
            raise HTTPException(status_code=404, detail="No resume found")
        
        resume["id"] = str(resume["_id"])
        del resume["_id"]
        return resume

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
        
        return StreamingResponse(
            grid_out,
            media_type="application/pdf"
        )

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
            headers={
                "Content-Disposition": f'attachment; filename="{resume["filename"]}"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download resume: {str(e)}")

@app.post("/projects", response_model=Dict[str, str])
async def add_project(project: Project):
    try:
        project_dict = project.dict()
        

        result = await db.projects.insert_one(project_dict)
        
        return {
            "message": "Project added successfully",
            "id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add project: {str(e)}")

@app.post("/projects/bulk", response_model=Dict[str, Any])
async def add_projects(projects: List[Project]):
    try:
        project_dicts = [project.dict() for project in projects]
        
        result = await db.projects.insert_many(project_dicts)
        
        inserted_ids = [str(id) for id in result.inserted_ids]
        
        return {
            "message": f"Added {len(inserted_ids)} projects",
            "inserted_ids": inserted_ids
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add projects: {str(e)}")

@app.get("/projects", response_model=List[ProjectResponse])
async def get_projects():
    try:
        projects = []
        cursor = db.projects.find()
        
        async for project in cursor:
            project["id"] = str(project["_id"])
            del project["_id"]
            projects.append(project)
            
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")

@app.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    try:
        if not ObjectId.is_valid(project_id):
            raise HTTPException(status_code=400, detail="Invalid project ID")
        
        project = await db.projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project["id"] = str(project["_id"])
        del project["_id"]
        
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {str(e)}")

@app.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project: Project):
    try:
        if not ObjectId.is_valid(project_id):
            raise HTTPException(status_code=400, detail="Invalid project ID")
        
        existing_project = await db.projects.find_one({"_id": ObjectId(project_id)})
        if not existing_project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        update_result = await db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": project.dict()}
        )
        
        if update_result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Project was not updated")
        
        updated_project = await db.projects.find_one({"_id": ObjectId(project_id)})
        updated_project["id"] = str(updated_project["_id"])
        del updated_project["_id"]
        
        return updated_project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update project: {str(e)}")

@app.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    try:
        if not ObjectId.is_valid(project_id):
            raise HTTPException(status_code=400, detail="Invalid project ID")
        
        existing_project = await db.projects.find_one({"_id": ObjectId(project_id)})
        if not existing_project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        delete_result = await db.projects.delete_one({"_id": ObjectId(project_id)})
        
        if delete_result.deleted_count == 0:
            raise HTTPException(status_code=400, detail="Project was not deleted")
        
        return {"message": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")

@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "mongodb": "healthy",
            "youtube": "healthy",
            "spotify": "healthy",
            "ytmusic": "healthy"
        }
    }
    
    try:
        # Check MongoDB connection
        await client.admin.command('ping')
    except Exception as e:
        health_status["services"]["mongodb"] = "unhealthy"
        health_status["status"] = "degraded"
        logger.error(f"MongoDB health check failed: {str(e)}")
    
    try:
        # Check YouTube API
        youtube = get_youtube_client()
        youtube.channels().list(part="snippet", id="UC_x5XG1OV2P6uZZ5FSM9Ttw").execute()
    except Exception as e:
        health_status["services"]["youtube"] = "unhealthy"
        health_status["status"] = "degraded"
        logger.error(f"YouTube API health check failed: {str(e)}")
    
    try:
        # Check Spotify API
        spotify = get_spotify_client()
        spotify.artist("4tZwfgrHOc3mvqYlEYSvVi")
    except Exception as e:
        health_status["services"]["spotify"] = "unhealthy"
        health_status["status"] = "degraded"
        logger.error(f"Spotify API health check failed: {str(e)}")
    
    try:
        # Check YTMusic API
        ytmusic = get_ytmusic_client()
        ytmusic.get_song("dQw4w9WgXcQ")
    except Exception as e:
        health_status["services"]["ytmusic"] = "unhealthy"
        health_status["status"] = "degraded"
        logger.error(f"YTMusic API health check failed: {str(e)}")
    
    return health_status

