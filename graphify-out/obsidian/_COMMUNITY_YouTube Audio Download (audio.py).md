---
type: community
cohesion: 0.33
members: 7
---

# YouTube Audio Download (audio.py)

**Cohesion:** 0.33 - loosely connected
**Members:** 7 nodes

## Members
- [[Pick the first ytmusicapi search result whose title AND artist are     similar e]] - rationale - backend/app/audio.py
- [[Shared audio download helpers used by both the FastAPI backend and the standalon]] - rationale - backend/app/audio.py
- [[Synchronous yt-dlp download. Run inside an executor for use from async code.]] - rationale - backend/app/audio.py
- [[_ratio()]] - code - backend/app/audio.py
- [[audio.py]] - code - backend/app/audio.py
- [[download_audio_sync()]] - code - backend/app/audio.py
- [[pick_youtube_match()]] - code - backend/app/audio.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/YouTube_Audio_Download_(audio.py)
SORT file.name ASC
```
