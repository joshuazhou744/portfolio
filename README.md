# Portfolio Website

A personal portfolio website built with Next.js and FastAPI.

## Project Structure

```
/portfolio
  /frontend        # Next.js frontend
    /src           # React components and pages
    /public        # Static assets
    package.json   # Frontend dependencies
    ...
  /backend         # FastAPI backend
    /app           # API endpoints and business logic
    requirements.txt
    railway.toml   # Railway.app configuration
```

## Development Setup

1. Install dependencies:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

2. Set up environment variables:

Frontend (.env.local):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Backend (.env):
```
MONGODB_URL=your_mongodb_url
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
YOUTUBE_API_KEY=your_youtube_api_key
```

3. Run development servers:
```bash
# Run both frontend and backend
npm run dev

# Or run them separately
npm run dev:frontend
npm run dev:backend
```

## Deployment

### Backend (Railway.app)

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login and deploy:
```bash
railway login
cd backend
railway init
railway up
```

3. Set environment variables in Railway dashboard

### Frontend (Vercel)

1. Deploy to Vercel:
```bash
cd frontend
vercel
```

2. Set environment variables in Vercel dashboard:
```
NEXT_PUBLIC_API_URL=https://your-railway-app-url
```

## Features

- Windows 98 themed UI
- Project showcase
- Resume viewer
- Music player with Spotify integration
- Responsive design
- MongoDB database
- FastAPI backend
- Next.js frontend

## Tech Stack

- Frontend:
  - Next.js
  - React
  - TypeScript
  - 98.css

- Backend:
  - FastAPI
  - MongoDB
  - GridFS
  - Python

## License

MIT
