# Pick'em

A pick'em app for friend groups who follow sports. Pick game winners with the odds shown.

It covers NFL, NBA, MLB and NHL games: sign in, pick a winner, and your picks are saved to your account.

## Stack

- Next.js (App Router) on Vercel
- Supabase for sign-in and the database
- The Odds API for games and moneyline odds

## Run it locally

1. Copy `.env.example` to `.env.local` and fill in the four values.
2. Run `supabase/migrations/0001_init.sql` in the Supabase SQL editor.
3. Install and start:

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## How odds are fetched

Odds are stored in Supabase. When someone opens the games page and the stored odds for that league are more than 6 hours old, the server fetches fresh ones (1 API credit). The browser never talks to The Odds API and never sees its key.
