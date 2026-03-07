# Epsy (Vite + React + Supabase)

## Setup

1. Install dependencies

```bash
npm install
```

2. Create environment variables (local dev)

Create a `.env` file (do **not** commit it):

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

3. Run locally

```bash
npm run dev
```

## Deploy (Vercel)

- Import the GitHub repo into Vercel
- Add the same env vars in Vercel Project → Settings → Environment Variables
- Ensure `vercel.json` contains a rewrite for React Router
