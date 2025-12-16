---
type: community
cohesion: 0.22
members: 9
---

# Pydantic Data Models

**Cohesion:** 0.22 - loosely connected
**Members:** 9 nodes

## Members
- [[BaseModel]] - code
- [[ContactInfo]] - code - backend/app/main.py
- [[Project]] - code - backend/app/main.py
- [[ProjectResponse]] - code - backend/app/main.py
- [[ResumeMetadata]] - code - backend/app/main.py
- [[Song]] - code - backend/app/main.py
- [[SongResponse]] - code - backend/app/main.py
- [[get_contact()]] - code - backend/app/main.py
- [[upload_resume()]] - code - backend/app/main.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Pydantic_Data_Models
SORT file.name ASC
```

## Connections to other communities
- 10 edges to [[_COMMUNITY_Backend FastAPI Routes]]
- 1 edge to [[_COMMUNITY_CRUD Endpoints + Mongo Helpers]]

## Top bridge nodes
- [[get_contact()]] - degree 3, connects to 2 communities
- [[BaseModel]] - degree 6, connects to 1 community
- [[ContactInfo]] - degree 3, connects to 1 community
- [[Project]] - degree 3, connects to 1 community
- [[ResumeMetadata]] - degree 3, connects to 1 community