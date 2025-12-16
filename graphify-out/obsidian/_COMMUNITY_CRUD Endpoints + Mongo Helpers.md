---
type: community
cohesion: 0.21
members: 12
---

# CRUD Endpoints + Mongo Helpers

**Cohesion:** 0.21 - loosely connected
**Members:** 12 nodes

## Members
- [[Convert Mongo's _id ObjectId field to a string `id` field in-place.]] - rationale - backend/app/main.py
- [[Validate an ObjectId string, fetch the document, and raise standard HTTP errors.]] - rationale - backend/app/main.py
- [[_fetch_by_object_id()]] - code - backend/app/main.py
- [[_strip_mongo_id()]] - code - backend/app/main.py
- [[delete_experience()]] - code - backend/app/main.py
- [[delete_project()]] - code - backend/app/main.py
- [[get_experience()]] - code - backend/app/main.py
- [[get_project()]] - code - backend/app/main.py
- [[get_projects()]] - code - backend/app/main.py
- [[get_resume()]] - code - backend/app/main.py
- [[update_experience()]] - code - backend/app/main.py
- [[update_project()]] - code - backend/app/main.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/CRUD_Endpoints_+_Mongo_Helpers
SORT file.name ASC
```

## Connections to other communities
- 10 edges to [[_COMMUNITY_Backend FastAPI Routes]]
- 5 edges to [[_COMMUNITY_Songs & YouTube Audio Routes]]
- 1 edge to [[_COMMUNITY_Pydantic Data Models]]
- 1 edge to [[_COMMUNITY_Experience Date Parsing]]

## Top bridge nodes
- [[_strip_mongo_id()]] - degree 12, connects to 4 communities
- [[_fetch_by_object_id()]] - degree 11, connects to 2 communities
- [[get_experience()]] - degree 3, connects to 1 community
- [[get_project()]] - degree 3, connects to 1 community
- [[update_experience()]] - degree 3, connects to 1 community