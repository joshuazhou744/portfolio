# Graph Report - .  (2026-04-09)

## Corpus Check
- 32 files · ~276,066 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 160 nodes · 209 edges · 23 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.77)
- Token cost: 70,152 input · 4,000 output

## God Nodes (most connected - your core abstractions)
1. `_strip_mongo_id()` - 12 edges
2. `_fetch_by_object_id()` - 11 edges
3. `Portfolio Music API` - 10 edges
4. `sync_songs.py script` - 10 edges
5. `showWindow()` - 7 edges
6. `check_collection_exists()` - 7 edges
7. `Portfolio README` - 5 edges
8. `get_song()` - 4 edges
9. `Adding New Songs Guide` - 4 edges
10. `MongoDB 'study' Collection` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Backend env (MONGODB_URL, SPOTIFY, YOUTUBE_API_KEY)` --shares_data_with--> `MongoDB + GridFS Audio Storage`  [INFERRED]
  README.md → backend/README.md
- `Backend env (MONGODB_URL, SPOTIFY, YOUTUBE_API_KEY)` --shares_data_with--> `Adding New Songs Guide`  [INFERRED]
  README.md → backend/ADDSONG.md
- `Portfolio Music API` --calls--> `motor 3.7.0`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `Portfolio Music API` --calls--> `python-multipart 0.0.20`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `Portfolio Music API` --calls--> `python-dotenv 1.0.1`  [INFERRED]
  backend/README.md → backend/requirements.txt

## Hyperedges (group relationships)
- **Spotify->YTMusic->yt-dlp->GridFS sync pipeline** — addsong_sync_script, requirements_spotipy, requirements_ytmusicapi, requirements_ytdlp, addsong_study_collection [EXTRACTED 0.95]
- **Backend core stack (FastAPI+Uvicorn+Motor+Mongo)** — backendreadme_music_api, requirements_fastapi, requirements_uvicorn, requirements_motor, backendreadme_mongodb_gridfs [INFERRED 0.85]
- **Deployment topology: Railway backend + Vercel frontend** — readme_deployment, readme_railway, readme_vercel [EXTRACTED 0.90]

## Communities

### Community 0 - "Desktop Window Shell"
Cohesion: 0.13
Nodes (7): handleAboutMeClick(), handleContactClick(), handleExperienceClick(), handleInfoClick(), handleProjectListClick(), handleResumeClick(), showWindow()

### Community 1 - "Project & Resume Windows"
Cohesion: 0.12
Nodes (0): 

### Community 2 - "Backend FastAPI Routes"
Cohesion: 0.15
Nodes (6): Config, Experience, ExperienceResponse, get_spotify_client(), get_spotify_playlist(), SpotifyTrack

### Community 3 - "Song Sync Pipeline (docs)"
Cohesion: 0.15
Nodes (15): Rationale: dedupe by spotify_id, resume on partial failure, Adding New Songs Guide, ffmpeg Dependency, frontend/src/components/media-player.tsx hardcoded 'study', --override Flag, Rationale: exact title match avoids substring collisions, Production Data Warning, MongoDB 'study' Collection (+7 more)

### Community 4 - "Backend API Stack & Models"
Cohesion: 0.17
Nodes (13): Spotify Playlist Mirroring, Song API Endpoints, Portfolio Music API, Song Data Model, Swagger UI / ReDoc, fastapi 0.115.11, motor 3.7.0, pydantic 2.10.6 (+5 more)

### Community 5 - "CRUD Endpoints + Mongo Helpers"
Cohesion: 0.21
Nodes (12): delete_experience(), delete_project(), _fetch_by_object_id(), get_experience(), get_project(), get_projects(), get_resume(), Convert Mongo's _id ObjectId field to a string `id` field in-place. (+4 more)

### Community 6 - "Pydantic Data Models"
Cohesion: 0.22
Nodes (9): BaseModel, ContactInfo, get_contact(), Project, ProjectResponse, ResumeMetadata, Song, SongResponse (+1 more)

### Community 7 - "Project README & Deployment"
Cohesion: 0.22
Nodes (9): Deployment, Development Setup, Docker Quickstart, Frontend env (NEXT_PUBLIC_API_URL), MIT License, UI Inspired by plaza.one, Portfolio README, Railway.app Backend Deployment (+1 more)

### Community 8 - "Songs & YouTube Audio Routes"
Cohesion: 0.25
Nodes (8): attach_youtube_audio(), check_collection_exists(), delete_song(), get_song(), get_song_audio(), get_songs(), get_ytmusic_client(), process_songs_without_audio()

### Community 9 - "YouTube Audio Download (audio.py)"
Cohesion: 0.33
Nodes (6): download_audio_sync(), pick_youtube_match(), _ratio(), Shared audio download helpers used by both the FastAPI backend and the standalon, Pick the first ytmusicapi search result whose title AND artist are     similar e, Synchronous yt-dlp download. Run inside an executor for use from async code.

### Community 10 - "Experience List Window"
Cohesion: 0.33
Nodes (0): 

### Community 11 - "sync_songs Script"
Cohesion: 0.47
Nodes (5): _apply_overrides(), main(), Sync new songs from a Spotify playlist into MongoDB.  Usage:     cd backend, For each (title, url) override, find the matching song doc, delete its     exist, sync()

### Community 12 - "Next.js App Shell"
Cohesion: 0.5
Nodes (0): 

### Community 13 - "Experience Date Parsing"
Cohesion: 0.67
Nodes (3): get_experiences(), _parse_experience_date(), Parse 'Month YYYY' or 'Present' into a sortable (year, month) tuple.

### Community 14 - "Project Sort Key"
Cohesion: 1.0
Nodes (2): _project_sort_key(), Sort key for /projects: explicit `level` ascending, then year descending.

### Community 15 - "Spotify Asset"
Cohesion: 1.0
Nodes (2): Spotify (Music Streaming Service), Spotify Logo

### Community 16 - "Next Config"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Next Env Types"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Styles Module Types"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "google-api-python-client"
Cohesion: 1.0
Nodes (1): google-api-python-client 2.165.0

### Community 21 - "Penguin Asset"
Cohesion: 1.0
Nodes (1): Penguin with Machete (decorative asset)

### Community 22 - "Sky Asset"
Cohesion: 1.0
Nodes (1): Sky with Clouds Illustration

## Knowledge Gaps
- **38 isolated node(s):** `Shared audio download helpers used by both the FastAPI backend and the standalon`, `Pick the first ytmusicapi search result whose title AND artist are     similar e`, `Synchronous yt-dlp download. Run inside an executor for use from async code.`, `Config`, `Convert Mongo's _id ObjectId field to a string `id` field in-place.` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Project Sort Key`** (2 nodes): `_project_sort_key()`, `Sort key for /projects: explicit `level` ascending, then year descending.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Spotify Asset`** (2 nodes): `Spotify (Music Streaming Service)`, `Spotify Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next Config`** (1 nodes): `next.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next Env Types`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Styles Module Types`** (1 nodes): `styles.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `google-api-python-client`** (1 nodes): `google-api-python-client 2.165.0`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Penguin Asset`** (1 nodes): `Penguin with Machete (decorative asset)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sky Asset`** (1 nodes): `Sky with Clouds Illustration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Portfolio Music API` connect `Backend API Stack & Models` to `Song Sync Pipeline (docs)`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `sync_songs.py script` connect `Song Sync Pipeline (docs)` to `Backend API Stack & Models`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `Backend env (MONGODB_URL, SPOTIFY, YOUTUBE_API_KEY)` connect `Song Sync Pipeline (docs)` to `Project README & Deployment`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Portfolio Music API` (e.g. with `motor 3.7.0` and `pydantic 2.10.6`) actually correct?**
  _`Portfolio Music API` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Shared audio download helpers used by both the FastAPI backend and the standalon`, `Pick the first ytmusicapi search result whose title AND artist are     similar e`, `Synchronous yt-dlp download. Run inside an executor for use from async code.` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Desktop Window Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Project & Resume Windows` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._