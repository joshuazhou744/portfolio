from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse
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

# Load environment variables
load_dotenv()

# YouTube API setup
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)

app = FastAPI(title="Portfolio Music API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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

# Pydantic models for request/response
from pydantic import BaseModel

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

# Initialize YTMusic
ytmusic = YTMusic()

@app.on_event("startup")
async def startup_db_client():
    # Remove automatic index creation for playlist collection
    pass

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.get("/songs/{collection_name}", response_model=List[SongResponse])
async def get_songs(collection_name: str):
    try:
        # Check if collection exists
        collections = await db.list_collection_names()
        if collection_name not in collections:
            raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' does not exist")
        
        songs = []
        cursor = db[collection_name].find()
        async for song in cursor:
            song["id"] = str(song["_id"])
            del song["_id"]
            songs.append(song)
        return songs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch songs: {str(e)}")

@app.get("/songs/{collection_name}/{song_id}", response_model=SongResponse)
async def get_song(collection_name: str, song_id: str):
    try:
        # Check if collection exists
        collections = await db.list_collection_names()
        if collection_name not in collections:
            raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' does not exist")
        
        if not ObjectId.is_valid(song_id):
            raise HTTPException(status_code=400, detail="Invalid song ID")
        
        song = await db[collection_name].find_one({"_id": ObjectId(song_id)})
        if not song:
            raise HTTPException(status_code=404, detail="Song not found")
        
        song["id"] = str(song["_id"])
        del song["_id"]
        return song
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch song: {str(e)}")

@app.get("/songs/{collection_name}/{song_id}/audio")
async def get_song_audio(collection_name: str, song_id: str):
    try:
        # Check if collection exists
        collections = await db.list_collection_names()
        if collection_name not in collections:
            raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' does not exist")
        
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch song audio: {str(e)}")

@app.delete("/songs/{collection_name}/{song_id}")
async def delete_song(collection_name: str, song_id: str):
    try:
        # Check if collection exists
        collections = await db.list_collection_names()
        if collection_name not in collections:
            raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' does not exist")
        
        if not ObjectId.is_valid(song_id):
            raise HTTPException(status_code=400, detail="Invalid song ID")
        
        song = await db[collection_name].find_one({"_id": ObjectId(song_id)})
        if not song:
            raise HTTPException(status_code=404, detail="Song not found")
        
        # Delete audio file from GridFS if it exists
        if song.get("audio_file_id"):
            await fs.delete(ObjectId(song["audio_file_id"]))
        
        # Delete song document
        await db[collection_name].delete_one({"_id": ObjectId(song_id)})
        return {"message": "Song deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete song: {str(e)}")

@app.get("/spotify/playlist/{playlist_id}", response_model=List[SpotifyTrack])
async def get_spotify_playlist(playlist_id: str):
    try:
        # Get playlist tracks
        results = spotify.playlist_tracks(playlist_id)
        tracks = []
        
        # Process each track
        for item in results['items']:
            track = item['track']
            if track:  # Skip if track is None (can happen with deleted tracks)
                # Check for duplicates
                existing_song = await db.playlist.find_one({"spotify_id": track['id']})
                if existing_song:
                    continue
                
                # Get the first artist
                artist = track['artists'][0]['name']
                
                # Get the album cover image (prefer large size)
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
        # Check if collection exists
        collections = await db.list_collection_names()
        if collection_name not in collections:
            raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' does not exist")
        
        # Check if song exists in collection
        song = await db[collection_name].find_one({"spotify_id": spotify_id})
        if not song:
            raise HTTPException(status_code=404, detail="Song not found in collection")
        
        # Check if song already has audio
        if song.get("audio_file_id"):
            raise HTTPException(status_code=400, detail="Song already has audio attached")
        
        # Create a thread pool for running yt-dlp operations
        executor = ThreadPoolExecutor()
        
        try:
            # Download audio using yt-dlp in a separate thread
            def download_audio():
                try:
                    import tempfile
                    import os
                    
                    # Create a temporary directory
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
                        
                        # Download the file
                        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                            ydl.download([youtube_url])
                            
                            # Find the downloaded file (should be the only file in temp_dir)
                            files = os.listdir(temp_dir)
                            if not files:
                                raise Exception("No audio file was downloaded")
                                
                            audio_file_path = os.path.join(temp_dir, files[0])
                            
                            # Read the file into memory
                            with open(audio_file_path, 'rb') as f:
                                return f.read()
                        
                except Exception as e:
                    raise Exception(f"Failed to download audio: {str(e)}")
            
            # Run the download in a thread pool with timeout
            try:
                audio_data = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(executor, download_audio),
                    timeout=60.0  # 60 second timeout
                )
            except asyncio.TimeoutError:
                raise HTTPException(
                    status_code=400,
                    detail="Download timed out. Please try again."
                )
            
            # Upload to GridFS using the correct method
            filename = f"{song['title']}.mp3"
            grid_in = await fs.upload_from_stream(
                filename,
                io.BytesIO(audio_data),
                metadata={"contentType": "audio/mp3"}
            )
            
            # Update song document with audio file ID
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
        # Check if collection exists
        collections = await db.list_collection_names()

        # Insert all songs into the specified collection
        result = await db[collection_name].insert_many(songs)
        
        # Convert ObjectIds to strings for JSON serialization
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
        # Check if collection exists
        collections = await db.list_collection_names()
        if collection_name not in collections:
            raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' does not exist")
        
        # Find all songs without youtube_link or audio_file_id
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
                # Search for the song on YouTube Music
                search_query = f"{song['title']} {song['artist']}"
                
                # Call YTMusic API to search for the video
                search_results = ytmusic.search(search_query, filter='songs')
                
                # Check if we got any results
                if not search_results:
                    failed_songs.append({
                        "title": song['title'],
                        "artist": song['artist'],
                        "reason": "No YouTube results found"
                    })
                    continue
                
                # Get the first result
                first_result = search_results[0]
                print(first_result)
                youtube_id = first_result['videoId']
                youtube_url = f"https://www.youtube.com/watch?v={youtube_id}"
                
                # Download the audio using yt-dlp
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
                    
                    # Download with timeout
                    audio_data = await asyncio.wait_for(
                        asyncio.get_event_loop().run_in_executor(executor, download_audio),
                        timeout=60.0
                    )
                    
                    # Upload to GridFS
                    filename = f"{song['title']}.mp3"
                    grid_in = await fs.upload_from_stream(
                        filename,
                        io.BytesIO(audio_data),
                        metadata={"contentType": "audio/mp3"}
                    )
                    
                    # Update song with youtube_link and audio_file_id
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