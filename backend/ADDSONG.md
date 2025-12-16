# Adding new songs

The website's player reads from the `study` MongoDB collection. To add new
songs, mirror them from a Spotify playlist with one local script. The
backend does **not** need to be running.

## One-time setup

1. Make sure `backend/.env` has these values (see `backend/.env.example`):
   - `MONGODB_URL` — your Mongo connection string
   - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` — from your Spotify app
   - `SPOTIFY_PLAYLIST_ID` — the playlist to mirror, e.g.
     `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M`
     → `37i9dQZF1DXcBWIGoYBM5M`

2. Make sure `ffmpeg` is on your `PATH` (`brew install ffmpeg` or your distro's
   equivalent). yt-dlp uses it to extract MP3 audio.

3. Activate the backend's Python venv (the script reuses the same deps).

## Usage

```bash
cd backend
source .venv/bin/activate    # or however you activate the project venv
python scripts/sync_songs.py
```

That's it. The script:

1. Pulls every track from your Spotify playlist
2. Inserts any track not already in the `study` collection (deduped by
   `spotify_id`)
3. For every song missing audio, searches YouTube Music, downloads via
   yt-dlp, and uploads the MP3 into MongoDB GridFS

Output:

```
Connecting to Mongo...
Fetching playlist 37i9dQZF1DXcBWIGoYBM5M from Spotify...
  inserted        : 4
  skipped (exists): 28

Finding songs missing audio...
  -> Feel Good Inc. / Gorillaz
  -> Chemical / Malcolm Todd
  ...

  audio downloaded: 4
  failed          : 0
```

## Fixing a wrong YouTube match

The script auto-matches each Spotify track to a YouTube Music result by
title + artist similarity (>=0.7 on both). When that picks the wrong upload
— common for generic titles like "Who Knows" where multiple artists have a
song with the same name — pin the right URL manually:

```bash
python scripts/sync_songs.py --override "Who Knows" "https://youtu.be/abc123"
```

What `--override` does:

1. Looks up the song by title (case-insensitive **exact** match — not a
   substring, so `"who knows"` won't accidentally pin "Who Knows Where The
   Time Goes")
2. Deletes any existing audio file from GridFS for that song
3. Sets `youtube_link` on the song document and unsets `audio_file_id`
4. Then runs the normal sync, which sees the song is now missing audio and
   downloads it from your pinned URL (skipping the YT Music search entirely)

Repeatable for multiple songs in one run:

```bash
python scripts/sync_songs.py \
  --override "Who Knows" "https://youtu.be/abc123" \
  --override "Some Other Song" "https://youtu.be/xyz456"
```

If the title matches zero or more than one song, the script aborts and
tells you so you can be more specific.

You can also pin a song without ever using `--override` by setting
`youtube_link` directly on a Mongo doc — the sync loop respects any
existing `youtube_link` and skips the search.

## Pointing at a different collection

```bash
python scripts/sync_songs.py --collection chill
```

Note: the website's player reads from `study` (hardcoded in
`frontend/src/components/media-player.tsx`). If you want to use a different
collection name, also update that constant.

## Pointing at production data

The script connects to whatever `MONGODB_URL` is set in `backend/.env`. If
that's your prod connection string, the sync writes directly to prod. If
you want to keep dev and prod separate, swap the env var or run with a
different `.env`:

```bash
MONGODB_URL='mongodb+srv://prod-creds...' python scripts/sync_songs.py
```

## Troubleshooting

- `ERROR: missing env vars` → fill them in `backend/.env`.
- `ffmpeg not found` (from yt-dlp) → install ffmpeg system-wide.
- A track shows up under "Failures" with `No YouTube results` → ytmusicapi
  couldn't find it; the song will retry on the next run.
- Individual `Failed to download audio` errors → re-run the script. Each
  run only re-processes songs still missing `audio_file_id`, so partial
  failures recover automatically.
