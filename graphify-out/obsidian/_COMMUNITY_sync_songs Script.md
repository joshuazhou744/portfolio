---
type: community
cohesion: 0.47
members: 6
---

# sync_songs Script

**Cohesion:** 0.47 - moderately connected
**Members:** 6 nodes

## Members
- [[For each (title, url) override, find the matching song doc, delete its     exist]] - rationale - backend/scripts/sync_songs.py
- [[Sync new songs from a Spotify playlist into MongoDB.  Usage     cd backend]] - rationale - backend/scripts/sync_songs.py
- [[_apply_overrides()]] - code - backend/scripts/sync_songs.py
- [[main()]] - code - backend/scripts/sync_songs.py
- [[sync()]] - code - backend/scripts/sync_songs.py
- [[sync_songs.py]] - code - backend/scripts/sync_songs.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/sync_songs_Script
SORT file.name ASC
```
