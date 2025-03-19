# Portfolio Music API

A FastAPI backend for managing a music playlist with MongoDB and GridFS for audio file storage.

## Setup

1. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
- Copy `.env.example` to `.env`
- Update `MONGODB_URL` with your MongoDB Atlas connection string

4. Run the server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Available Endpoints

- `POST /songs/` - Upload a new song with audio file
- `GET /songs/` - Get all songs
- `GET /songs/{song_id}` - Get a specific song
- `GET /songs/{song_id}/audio` - Stream a song's audio
- `DELETE /songs/{song_id}` - Delete a song

## Data Model

Each song in the playlist collection has the following fields:
- `title`: Song title
- `artist`: Artist name
- `cover_image_url`: URL to the song's cover image
- `audio_file_id`: GridFS ID of the stored audio file 