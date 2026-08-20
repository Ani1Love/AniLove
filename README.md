# AniLove

AniLove is a Vite + React anime discovery and watch-tracking app. It uses the AniList GraphQL API for catalog data and stores local library/settings data in the browser.

## Local preview

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually <http://localhost:3000/>.

## Available scripts

- `npm run dev` starts the local development server on port 3000.
- `npm run build` creates a production build in `dist/`.
- `npm run preview` serves the production build locally.
- `npm run lint` runs TypeScript validation with `tsc --noEmit`.

## App areas

- Home catalog rows for trending, popular, top-rated, and newest anime.
- Search and filtering views backed by AniList data.
- Schedule, library, settings, detail modal, trailer modal, and watch/player views.
- Local persistence for user library, settings, and notifications.
