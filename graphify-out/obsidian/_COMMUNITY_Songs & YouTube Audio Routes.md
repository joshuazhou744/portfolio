---
type: community
cohesion: 0.25
members: 8
---

# Songs & YouTube Audio Routes

**Cohesion:** 0.25 - loosely connected
**Members:** 8 nodes

## Members
- [[attach_youtube_audio()]] - code - backend/app/main.py
- [[check_collection_exists()]] - code - backend/app/main.py
- [[delete_song()]] - code - backend/app/main.py
- [[get_song()]] - code - backend/app/main.py
- [[get_song_audio()]] - code - backend/app/main.py
- [[get_songs()]] - code - backend/app/main.py
- [[get_ytmusic_client()]] - code - backend/app/main.py
- [[process_songs_without_audio()]] - code - backend/app/main.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Songs_&_YouTube_Audio_Routes
SORT file.name ASC
```

## Connections to other communities
- 8 edges to [[_COMMUNITY_Backend FastAPI Routes]]
- 5 edges to [[_COMMUNITY_CRUD Endpoints + Mongo Helpers]]

## Top bridge nodes
- [[get_song()]] - degree 4, connects to 2 communities
- [[delete_song()]] - degree 3, connects to 2 communities
- [[get_song_audio()]] - degree 3, connects to 2 communities
- [[get_songs()]] - degree 3, connects to 2 communities
- [[check_collection_exists()]] - degree 7, connects to 1 community