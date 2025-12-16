---
type: community
cohesion: 1.00
members: 2
---

# Project Sort Key

**Cohesion:** 1.00 - tightly connected
**Members:** 2 nodes

## Members
- [[Sort key for projects explicit `level` ascending, then year descending.]] - rationale - backend/app/main.py
- [[_project_sort_key()]] - code - backend/app/main.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Project_Sort_Key
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Backend FastAPI Routes]]

## Top bridge nodes
- [[_project_sort_key()]] - degree 2, connects to 1 community