"""Sync new songs from a Spotify playlist into MongoDB.

Usage:
    cd backend
    source .venv/bin/activate
    python scripts/sync_songs.py [--collection study]

    # Manually pin a specific song to a specific YouTube URL when the
    # automatic title+artist matcher picks the wrong upload. Repeatable.
    python scripts/sync_songs.py --override "Who Knows" "https://youtu.be/abc"
    python scripts/sync_songs.py --override "Who Knows" "https://..." --override "Other" "https://..."

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
import re
import sys
from pathlib import Path

# Make `import app.audio` work regardless of where the script is invoked from.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

import spotipy  # noqa: E402
from bson import ObjectId  # noqa: E402
from dotenv import load_dotenv  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket  # noqa: E402
from spotipy.oauth2 import SpotifyClientCredentials  # noqa: E402
from ytmusicapi import YTMusic  # noqa: E402

from app.audio import download_audio_sync, pick_youtube_match  # noqa: E402

DEFAULT_COLLECTION = "study"


async def _apply_overrides(collection, fs, overrides: list[list[str]]) -> int:
    """For each (title, url) override, find the matching song doc, delete its
    existing audio from GridFS (if any), and pin its `youtube_link`. The next
    sync pass will pick it up because `audio_file_id` was unset.

    Returns 0 on success, non-zero if any override couldn't be resolved.
    """
    for title_query, url in overrides:
        # Case-insensitive exact title match. Anchored regex so "who knows"
        # doesn't accidentally match "who knows where the time goes".
        pattern = f"^{re.escape(title_query)}$"
        matches = await collection.find({"title": {"$regex": pattern, "$options": "i"}}).to_list(length=10)

        if not matches:
            print(f"ERROR: --override no song found with title {title_query!r}", file=sys.stderr)
            return 1
        if len(matches) > 1:
            print(f"ERROR: --override multiple songs match title {title_query!r}:", file=sys.stderr)
            for m in matches:
                print(f"  - {m['title']} / {m.get('artist', '?')}", file=sys.stderr)
            print("Use a more specific title (case-insensitive exact match).", file=sys.stderr)
            return 1

        song = matches[0]
        old_audio = song.get("audio_file_id")
        if old_audio:
            try:
                await fs.delete(ObjectId(old_audio))
            except Exception as e:
                print(f"  warning: failed to delete old audio for {song['title']}: {e}")

        await collection.update_one(
            {"_id": song["_id"]},
            {"$set": {"youtube_link": url}, "$unset": {"audio_file_id": ""}},
        )
        print(f"  override pinned: {song['title']} -> {url}")

    return 0


async def sync(collection_name: str, overrides: list[list[str]] | None) -> int:
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

    # Step 0 (optional): apply manual overrides before the normal sync.
    if overrides:
        print(f"\nApplying {len(overrides)} override(s)...")
        rc = await _apply_overrides(collection, fs, overrides)
        if rc != 0:
            mongo_client.close()
            return rc

    # Step 1: pull tracks from Spotify, insert any not already in the collection.
    print(f"\nFetching playlist {playlist_id} from Spotify...")
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

    # Step 2: for any song missing audio (newly inserted, pre-existing, or
    # just-overridden), download via yt-dlp and upload to GridFS.
    # If the song already has a `youtube_link` (manually pinned), use that
    # directly and skip the YouTube Music search.
    print("\nFinding songs missing audio...")
    ytmusic = YTMusic()
    audio_processed = 0
    failed: list[tuple[str, str]] = []
    loop = asyncio.get_event_loop()

    # Snapshot the IDs to process up front, then re-fetch each song fresh.
    # Iterating an open cursor while update_one mutates the same docs is a
    # known footgun (Motor can revisit batched docs). Decoupling fixes it.
    ids_to_process = [
        s["_id"]
        async for s in collection.find({"audio_file_id": {"$exists": False}}, {"_id": 1})
    ]
    print(f"  {len(ids_to_process)} song(s) to process")

    for song_id in ids_to_process:
        song = await collection.find_one({"_id": song_id})
        if not song or song.get("audio_file_id"):
            # Already processed by an earlier iteration or removed since snapshot.
            continue
        title = song.get("title", "")
        artist = song.get("artist", "")
        label = f"{title} / {artist}"
        try:
            print(f"  -> {label}")

            preset_link = song.get("youtube_link")
            if preset_link:
                youtube_url = preset_link
                print(f"     using pinned link: {youtube_url}")
            else:
                search_results = ytmusic.search(f"{title} {artist}", filter="songs")
                if not search_results:
                    failed.append((label, "No YouTube results"))
                    continue

                match = pick_youtube_match(title, artist, search_results)
                if not match:
                    top = search_results[0]
                    top_title = top.get("title") or "?"
                    top_artist = " ".join(a.get("name", "") for a in (top.get("artists") or [])) or "?"
                    failed.append((label, f"No title+artist match >=0.7 (top: {top_title!r} by {top_artist!r})"))
                    continue

                youtube_url = f"https://www.youtube.com/watch?v={match['videoId']}"
                matched_artist = " ".join(a.get("name", "") for a in (match.get("artists") or []))
                print(f"     matched: {match.get('title', '?')} by {matched_artist}")

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
    parser.add_argument(
        "--override",
        action="append",
        nargs=2,
        metavar=("SONG_TITLE", "YOUTUBE_URL"),
        help=(
            "Manually pin a YouTube URL for a song (case-insensitive exact "
            "title match). Deletes any existing audio for that song and "
            "re-downloads from the given URL. Repeatable."
        ),
    )
    args = parser.parse_args()
    return asyncio.run(sync(args.collection, args.override))


if __name__ == "__main__":
    sys.exit(main())
