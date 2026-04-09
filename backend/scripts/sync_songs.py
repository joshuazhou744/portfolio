"""Sync new songs from a Spotify playlist into MongoDB.

Usage:
    cd backend
    source .venv/bin/activate
    python scripts/sync_songs.py [--collection study]

This script talks directly to Spotify, YouTube Music, yt-dlp, and Mongo.
The backend does NOT need to be running. It uses the same env vars and the
same Python venv as the backend, so there is nothing extra to install or
configure.

Required env vars (from backend/.env):
    MONGODB_URL          Mongo connection string
    SPOTIFY_CLIENT_ID    Spotify app credentials
    SPOTIFY_CLIENT_SECRET
    SPOTIFY_PLAYLIST_ID  the Spotify playlist to mirror

External requirement:
    ffmpeg               must be on PATH (yt-dlp uses it for MP3 extraction)
"""

from __future__ import annotations

import argparse
import asyncio
import io
import os
import sys
from pathlib import Path

# Make `import app.audio` work regardless of where the script is invoked from.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

import spotipy  # noqa: E402
from dotenv import load_dotenv  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket  # noqa: E402
from spotipy.oauth2 import SpotifyClientCredentials  # noqa: E402
from ytmusicapi import YTMusic  # noqa: E402

from app.audio import download_audio_sync  # noqa: E402

DEFAULT_COLLECTION = "study"


async def sync(collection_name: str) -> int:
    load_dotenv(BACKEND_ROOT / ".env")

    mongo_url = os.getenv("MONGODB_URL")
    playlist_id = os.getenv("SPOTIFY_PLAYLIST_ID")
    spotify_client_id = os.getenv("SPOTIFY_CLIENT_ID")
    spotify_client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")

    missing = [
        name
        for name, val in (
            ("MONGODB_URL", mongo_url),
            ("SPOTIFY_PLAYLIST_ID", playlist_id),
            ("SPOTIFY_CLIENT_ID", spotify_client_id),
            ("SPOTIFY_CLIENT_SECRET", spotify_client_secret),
        )
        if not val
    ]
    if missing:
        print(f"ERROR: missing env vars: {', '.join(missing)}", file=sys.stderr)
        print("Set them in backend/.env (see backend/.env.example).", file=sys.stderr)
        return 1

    print("Connecting to Mongo...")
    mongo_client = AsyncIOMotorClient(mongo_url)
    db = mongo_client.portfolio
    collection = db[collection_name]
    fs = AsyncIOMotorGridFSBucket(db)

    # Step 1: pull tracks from Spotify, insert any not already in the collection.
    print(f"Fetching playlist {playlist_id} from Spotify...")
    spotify = spotipy.Spotify(
        client_credentials_manager=SpotifyClientCredentials(
            client_id=spotify_client_id,
            client_secret=spotify_client_secret,
        )
    )
    try:
        results = spotify.playlist_tracks(playlist_id)
    except Exception as e:
        print(f"ERROR: Spotify fetch failed: {e}", file=sys.stderr)
        mongo_client.close()
        return 2

    new_docs: list[dict] = []
    skipped_existing = 0
    for item in results.get("items", []):
        track = item.get("track")
        if not track:
            continue
        sid = track.get("id")
        if not sid:
            continue
        if await collection.find_one({"spotify_id": sid}):
            skipped_existing += 1
            continue
        new_docs.append(
            {
                "title": track["name"],
                "artist": track["artists"][0]["name"],
                "cover_image_url": (track["album"]["images"][0]["url"] if track["album"]["images"] else None),
                "spotify_id": sid,
            }
        )

    inserted = 0
    if new_docs:
        insert_result = await collection.insert_many(new_docs)
        inserted = len(insert_result.inserted_ids)

    print(f"  inserted        : {inserted}")
    print(f"  skipped (exists): {skipped_existing}")

    # Step 2: for any song missing audio (newly inserted OR pre-existing),
    # search YouTube Music, download via yt-dlp, upload to GridFS.
    print("\nFinding songs missing audio...")
    ytmusic = YTMusic()
    audio_processed = 0
    failed: list[tuple[str, str]] = []
    loop = asyncio.get_event_loop()

    cursor = collection.find({"audio_file_id": {"$exists": False}})
    async for song in cursor:
        title = song.get("title", "")
        artist = song.get("artist", "")
        label = f"{title} / {artist}"
        try:
            print(f"  -> {label}")
            search_results = ytmusic.search(f"{title} {artist}", filter="songs")
            if not search_results:
                failed.append((label, "No YouTube results"))
                continue

            youtube_url = f"https://www.youtube.com/watch?v={search_results[0]['videoId']}"
            audio_data = await loop.run_in_executor(None, download_audio_sync, youtube_url)

            grid_in = await fs.upload_from_stream(
                f"{title}.mp3",
                io.BytesIO(audio_data),
                metadata={"contentType": "audio/mp3"},
            )
            await collection.update_one(
                {"_id": song["_id"]},
                {"$set": {"youtube_link": youtube_url, "audio_file_id": str(grid_in)}},
            )
            audio_processed += 1
        except Exception as e:
            failed.append((label, str(e)))

    print(f"\n  audio downloaded: {audio_processed}")
    print(f"  failed          : {len(failed)}")
    if failed:
        print("\nFailures:")
        for label, reason in failed:
            print(f"  - {label}: {reason}")

    mongo_client.close()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sync songs from a Spotify playlist into MongoDB.",
    )
    parser.add_argument(
        "--collection",
        default=DEFAULT_COLLECTION,
        help=f"Mongo collection to sync into (default: {DEFAULT_COLLECTION})",
    )
    args = parser.parse_args()
    return asyncio.run(sync(args.collection))


if __name__ == "__main__":
    sys.exit(main())
