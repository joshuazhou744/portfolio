"""Shared audio download helpers used by both the FastAPI backend and the
standalone scripts in `backend/scripts/`.

Keeping this in its own module avoids duplicating the (long) yt-dlp options
dict and means the script doesn't need to import the FastAPI app to reuse
the download logic.
"""

import os
import tempfile
from difflib import SequenceMatcher

import yt_dlp

YDL_OPTS = {
    "format": "bestaudio/best",
    "postprocessors": [
        {
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }
    ],
    "quiet": True,
    "no_warnings": True,
    # Critical: never follow `&list=` from a watch URL. Without this yt-dlp
    # downloads the whole playlist for any "https://youtube.com/watch?v=X&list=Y"
    # URL, which looks like the script is downloading the same song forever.
    "noplaylist": True,
    "cookiefile": "cookies.txt",
    "user_agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    ),
    "extractor_retries": 3,
    "ignoreerrors": True,
    "no_check_certificate": True,
    "prefer_insecure": True,
    "format_sort": ["ext:mp4:m4a", "res:720", "codec:h264", "codec:aac"],
    "format_sort_force": True,
}


def _ratio(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def pick_youtube_match(
    title: str,
    artist: str,
    results: list,
    threshold: float = 0.7,
) -> dict | None:
    """Pick the first ytmusicapi search result whose title AND artist are
    similar enough to the song we're looking for.

    Both checks use `difflib.SequenceMatcher.ratio()` against the same
    threshold. Requiring both to match prevents picking the wrong upload
    when the title is generic (e.g. "Who Knows" by a different artist).

    Returns None if no result clears both bars; the caller should treat that
    as a failure rather than blindly downloading the top result.
    """
    if not title or not artist or not results:
        return None
    for result in results:
        result_title = result.get("title") or ""
        result_artist = " ".join(a.get("name", "") for a in (result.get("artists") or []))
        if not result_title or not result_artist:
            continue
        if _ratio(title, result_title) >= threshold and _ratio(artist, result_artist) >= threshold:
            return result
    return None


def download_audio_sync(youtube_url: str) -> bytes:
    """Synchronous yt-dlp download. Run inside an executor for use from async code.

    Returns the raw MP3 bytes. Raises Exception on any failure.
    """
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            opts = {**YDL_OPTS, "outtmpl": os.path.join(temp_dir, "%(title)s.%(ext)s")}
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.download([youtube_url])

                files = os.listdir(temp_dir)
                if not files:
                    raise Exception("No audio file was downloaded")

                with open(os.path.join(temp_dir, files[0]), "rb") as f:
                    return f.read()
    except Exception as e:
        raise Exception(f"Failed to download audio: {str(e)}") from e
