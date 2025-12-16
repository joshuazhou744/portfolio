---
type: community
cohesion: 0.67
members: 3
---

# Experience Date Parsing

**Cohesion:** 0.67 - moderately connected
**Members:** 3 nodes

## Members
- [[Parse 'Month YYYY' or 'Present' into a sortable (year, month) tuple.]] - rationale - backend/app/main.py
- [[_parse_experience_date()]] - code - backend/app/main.py
- [[get_experiences()]] - code - backend/app/main.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Experience_Date_Parsing
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Backend FastAPI Routes]]
- 1 edge to [[_COMMUNITY_CRUD Endpoints + Mongo Helpers]]

## Top bridge nodes
- [[get_experiences()]] - degree 3, connects to 2 communities
- [[_parse_experience_date()]] - degree 3, connects to 1 community