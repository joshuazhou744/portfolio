---
type: community
cohesion: 0.15
members: 16
---

# Backend FastAPI Routes

**Cohesion:** 0.15 - loosely connected
**Members:** 16 nodes

## Members
- [[Config]] - code - backend/app/main.py
- [[Experience]] - code - backend/app/main.py
- [[ExperienceResponse]] - code - backend/app/main.py
- [[SpotifyTrack]] - code - backend/app/main.py
- [[add_experience()]] - code - backend/app/main.py
- [[add_experiences()]] - code - backend/app/main.py
- [[add_project()]] - code - backend/app/main.py
- [[add_projects()]] - code - backend/app/main.py
- [[add_songs_to_collection()]] - code - backend/app/main.py
- [[download_resume()]] - code - backend/app/main.py
- [[get_spotify_client()]] - code - backend/app/main.py
- [[get_spotify_playlist()]] - code - backend/app/main.py
- [[get_youtube_client()]] - code - backend/app/main.py
- [[health_check()]] - code - backend/app/main.py
- [[main.py]] - code - backend/app/main.py
- [[view_resume()]] - code - backend/app/main.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Backend_FastAPI_Routes
SORT file.name ASC
```

## Connections to other communities
- 10 edges to [[_COMMUNITY_CRUD Endpoints + Mongo Helpers]]
- 10 edges to [[_COMMUNITY_Pydantic Data Models]]
- 8 edges to [[_COMMUNITY_Songs & YouTube Audio Routes]]
- 2 edges to [[_COMMUNITY_Experience Date Parsing]]
- 1 edge to [[_COMMUNITY_Project Sort Key]]

## Top bridge nodes
- [[main.py]] - degree 44, connects to 5 communities
- [[Experience]] - degree 3, connects to 1 community
- [[SpotifyTrack]] - degree 3, connects to 1 community