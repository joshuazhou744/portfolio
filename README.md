My portfolio website

**UI inspired by plaza.one**

## Docker Quickstart

1. Setup env variables in .env files in frontend and backend

2. Run docker compose
```bash
# only use --build flag after changes are made
# assuming all env variables are in env files in frontend and backend
docker compose --env-file ./backend/.env up --build

OR

npm run dev docker:build
npm run dev docker:up

```

## Development Setup

1. Install dependencies:
```bash
# install frontend dependencies
cd frontend
npm install

# install backend dependencies
cd ../backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Set up environment variables for development:

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
FRONTEND_URL=fronted_url_for_cors
```

3. Run development servers:
```bash
# run both frontend and backend
npm run dev
# seperate
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

3. Set env variables in Railway dashboard

### Frontend (Vercel)

1. Deploy to Vercel:
```bash
cd frontend
vercel
```

2. Set api url env variable

## License

MIT
