---
type: community
cohesion: 0.15
members: 15
---

# Song Sync Pipeline (docs)

**Cohesion:** 0.15 - loosely connected
**Members:** 15 nodes

## Members
- [[--override Flag]] - document - backend/ADDSONG.md
- [[Adding New Songs Guide]] - document - backend/ADDSONG.md
- [[Backend env (MONGODB_URL, SPOTIFY, YOUTUBE_API_KEY)]] - document - README.md
- [[MongoDB 'study' Collection]] - document - backend/ADDSONG.md
- [[MongoDB + GridFS Audio Storage]] - document - backend/README.md
- [[Production Data Warning]] - document - backend/ADDSONG.md
- [[Rationale dedupe by spotify_id, resume on partial failure]] - document - backend/ADDSONG.md
- [[Rationale exact title match avoids substring collisions]] - document - backend/ADDSONG.md
- [[YouTube Music Title+Artist Matching (=0.7)]] - document - backend/ADDSONG.md
- [[ffmpeg Dependency]] - document - backend/ADDSONG.md
- [[frontendsrccomponentsmedia-player.tsx hardcoded 'study']] - document - backend/ADDSONG.md
- [[spotipy 2.23.0]] - document - backend/requirements.txt
- [[sync_songs.py script]] - document - backend/ADDSONG.md
- [[yt-dlp 2025.6.30]] - document - backend/requirements.txt
- [[ytmusicapi 1.10.2]] - document - backend/requirements.txt

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Song_Sync_Pipeline_(docs)
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Backend API Stack & Models]]
- 1 edge to [[_COMMUNITY_Project README & Deployment]]

## Top bridge nodes
- [[sync_songs.py script]] - degree 10, connects to 1 community
- [[MongoDB + GridFS Audio Storage]] - degree 3, connects to 1 community
- [[Backend env (MONGODB_URL, SPOTIFY, YOUTUBE_API_KEY)]] - degree 3, connects to 1 community