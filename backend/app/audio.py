"""Shared audio download helpers used by both the FastAPI backend and the
standalone scripts in `backend/scripts/`.

Keeping this in its own module avoids duplicating the (long) yt-dlp options
dict and means the script doesn't need to import the FastAPI app to reuse
the download logic.
"""

import os
import tempfile

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
