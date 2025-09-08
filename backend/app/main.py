from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Depends, status, Security
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
import secrets

from pydantic import BaseModel

from fastapi.security import APIKeyHeader, HTTPBasic, HTTPBasicCredentials
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

# load environment variables
load_dotenv()

API_KEY = os.getenv("API_KEY")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# YouTube API and ytmusicapi setup
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
ytmusic = YTMusic()

# basic http auth for docs
security = HTTPBasic()
def verify_docs_access(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = os.getenv("DOCS_USERNAME")
    correct_password = os.getenv("DOCS_PASSWORD")
    if not correct_username or not correct_password:
        raise HTTPException(status_code=500, detail="Docs credentials not configured")
    
    # Use secrets.compare_digest to prevent timing attacks
    correct_username_check = secrets.compare_digest(credentials.username, correct_username)
    correct_password_check = secrets.compare_digest(credentials.password, correct_password)
    
    if not (correct_username_check and correct_password_check):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"}
        )
    return True

app = FastAPI(title="Portfolio Music API", docs_url=None, redoc_url=None, openapi_url=None)

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

def verify_api_key(api_key: str = Security(api_key_header)):
    if not api_key or api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Not authenticated")

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

class Experience(BaseModel):
    title: str
    company: str
    location: str
    start_date: str
    end_date: str
    description: List[str]
    

class ExperienceResponse(Experience):
    id: str

    class Config:
        from_attributes = True

@app.get("/health")
async def health_check():
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )

@app.get("/songs/{collection_name}", response_model=List[SongResponse])
async def get_songs(collection_name: str, noshuffle: bool = False, api_key: str = Depends(verify_api_key)):
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
async def get_song(collection_name: str, song_id: str, api_key: str = Depends(verify_api_key)):
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
async def get_song_audio(collection_name: str, song_id: str, api_key: str = Depends(verify_api_key)):
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
async def delete_song(collection_name: str, song_id: str, api_key: str = Depends(verify_api_key)):
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
async def get_spotify_playlist(playlist_id: str, collection: str = "study", api_key: str = Depends(verify_api_key)):
    try:    
        # Use the get_spotify_client() function instead of global variable
        spotify_client = get_spotify_client()
        results = spotify_client.playlist_tracks(playlist_id)
        tracks = []
        
        for item in results['items']:
            track = item['track']
            if track:  
                # check for duplicates in the specified collection
                existing_song = await db[collection].find_one({"spotify_id": track['id']})
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
    youtube_url: str = Query(..., description="YouTube URL for the audio"),
    api_key: str = Depends(verify_api_key)
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
                            'no_warnings': True,
                            # Add bypass options
                            'cookiefile': 'cookies.txt',  # If you have cookies file
                            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'extractor_retries': 3,
                            'ignoreerrors': True,
                            'no_check_certificate': True,
                            'prefer_insecure': True,
                            # Add fallback options
                            'format_sort': ['ext:mp4:m4a', 'res:720', 'codec:h264', 'codec:aac'],
                            'format_sort_force': True
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
async def add_songs_to_collection(collection_name: str, songs: List[Dict[str, Any]], api_key: str = Depends(verify_api_key)):
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
async def process_songs_without_audio(collection_name: str, api_key: str = Depends(verify_api_key)):
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
                ytmusic_client = get_ytmusic_client()
                search_results = ytmusic_client.search(search_query, filter='songs')
                
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
                                    'no_warnings': True,
                                    # Add bypass options
                                    'cookiefile': 'cookies.txt',  # If you have cookies file
                                    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                                    'extractor_retries': 3,
                                    'ignoreerrors': True,
                                    'no_check_certificate': True,
                                    'prefer_insecure': True,
                                    # Add fallback options
                                    'format_sort': ['ext:mp4:m4a', 'res:720', 'codec:h264', 'codec:aac'],
                                    'format_sort_force': True
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
async def upload_resume(file: UploadFile = File(...), api_key: str = Depends(verify_api_key)):
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
async def get_resume(api_key: str = Depends(verify_api_key)):
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
async def view_resume(api_key: str = Depends(verify_api_key)):
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
async def download_resume(api_key: str = Depends(verify_api_key)):
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
async def add_project(project: Project, api_key: str = Depends(verify_api_key)):
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
async def add_projects(projects: List[Project], api_key: str = Depends(verify_api_key)):
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
async def get_projects(api_key: str = Depends(verify_api_key)):
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
async def get_project(project_id: str, api_key: str = Depends(verify_api_key)):
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
async def update_project(project_id: str, project: Project, api_key: str = Depends(verify_api_key)):
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
async def delete_project(project_id: str, api_key: str = Depends(verify_api_key)):
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
    
@app.post("/experiences", response_model=Dict[str, str])
async def add_experience(experience: Experience, api_key: str = Depends(verify_api_key)):
    try:
        experience_dict = experience.dict()
        

        result = await db.experiences.insert_one(experience_dict)
        
        return {
            "message": "Experience added successfully",
            "id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add experience: {str(e)}")

@app.post("/experiences/bulk", response_model=Dict[str, Any])
async def add_experiences(experiences: List[Experience], api_key: str = Depends(verify_api_key)):
    try:
        experience_dicts = [experience.dict() for experience in experiences]
        
        result = await db.experiences.insert_many(experience_dicts)
        
        inserted_ids = [str(id) for id in result.inserted_ids]
        
        return {
            "message": f"Added {len(inserted_ids)} experiences",
            "inserted_ids": inserted_ids
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add experiences: {str(e)}")

@app.get("/experiences", response_model=List[ExperienceResponse])
async def get_experiences(api_key: str = Depends(verify_api_key)):
    try:
        experiences = []
        cursor = db.experiences.find()
        
        async for experience in cursor:
            experience["id"] = str(experience["_id"])
            del experience["_id"]
            experiences.append(experience)
        
        # Sort experiences by end_date in descending order (most recent first)
        def parse_date(date_str):
            if date_str == "Present":
                # Give "Present" the highest priority (most recent)
                return (9999, 12)  # Year 9999, month 12
            else:
                # Parse "Month YYYY" format
                try:
                    month_str, year_str = date_str.split()
                    month_map = {
                        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
                        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
                    }
                    month = month_map.get(month_str, 1)
                    year = int(year_str)
                    return (year, month)
                except:
                    # If parsing fails, put at the end
                    return (0, 0)
        
        # Sort by end_date descending, then by start_date descending
        experiences.sort(key=lambda x: (parse_date(x.get('end_date', 'Present')), parse_date(x.get('start_date', ''))), reverse=True)
            
        return experiences
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch experiences: {str(e)}")

@app.get("/experiences/{experience_id}", response_model=ExperienceResponse)
async def get_experience(experience_id: str, api_key: str = Depends(verify_api_key)):
    try:
        if not ObjectId.is_valid(experience_id):
            raise HTTPException(status_code=400, detail="Invalid experience ID")
        
        experience = await db.experiences.find_one({"_id": ObjectId(experience_id)})
        if not experience:
            raise HTTPException(status_code=404, detail="Experience not found")
        
        experience["id"] = str(experience["_id"])
        del experience["_id"]
        
        return experience
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch experience: {str(e)}")

@app.put("/experiences/{experience_id}", response_model=ExperienceResponse)
async def update_experience(experience_id: str, experience: Experience, api_key: str = Depends(verify_api_key)):
    try:
        if not ObjectId.is_valid(experience_id):
            raise HTTPException(status_code=400, detail="Invalid experience ID")
        
        existing_experience = await db.experiences.find_one({"_id": ObjectId(experience_id)})
        if not existing_experience:
            raise HTTPException(status_code=404, detail="Experience not found")
        
        update_result = await db.experiences.update_one(
            {"_id": ObjectId(experience_id)},
            {"$set": experience.dict()}
        )
        
        if update_result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Experience was not updated")
        
        updated_experience = await db.experiences.find_one({"_id": ObjectId(experience_id)})
        updated_experience["id"] = str(updated_experience["_id"])
        del updated_experience["_id"]
        
        return updated_experience
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update experience: {str(e)}")

@app.delete("/experiences/{experience_id}")
async def delete_experience(experience_id: str, api_key: str = Depends(verify_api_key)):
    try:
        if not ObjectId.is_valid(experience_id):
            raise HTTPException(status_code=400, detail="Invalid experience ID")
        
        existing_experience = await db.experiences.find_one({"_id": ObjectId(experience_id)})
        if not existing_experience:
            raise HTTPException(status_code=404, detail="Experience not found")
        
        delete_result = await db.experiences.delete_one({"_id": ObjectId(experience_id)})
        
        if delete_result.deleted_count == 0:
            raise HTTPException(status_code=400, detail="Experience was not deleted")
        
        return {"message": "Experience deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete experience: {str(e)}")

@app.get("/openapi.json", include_in_schema=False)
def custom_openapi(auth: bool = Depends(verify_docs_access)):
    return JSONResponse(get_openapi(title="Portfolio Music API", version="1.0.0", routes=app.routes))

@app.get("/docs", include_in_schema=False)
def custom_swagger_ui(auth: bool = Depends(verify_docs_access)):
    return get_swagger_ui_html(openapi_url="/openapi.json", title="API Documentation")