# WeFit Labs Live Leaderboard

A mobile-first, offline-ready tournament experience tailored for WeFit Labs NYC pickleball events. Built with Next.js 14, Supabase, Tailwind CSS, and real-time updates.

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```
2. Create a `.env.local` file
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   ```
3. Run the development server
   ```bash
   npm run dev
   ```

## Features

- Real-time bracket updates with Supabase Realtime
- QR-powered spectator check-in flow with Zod validation
- Scorer console with offline queue and undo history
- Sponsor ribbon with analytics tracking
- Shareable match cards generated via @vercel/og
- Tailwind-based dark mode UI with WeFit Labs branding
- next-pwa configuration for installable offline experience

## Scripts

- `npm run dev` - Start the development server
- `npm run build` - Create a production build
- `npm run start` - Run the production server
- `npm run lint` - Run ESLint checks

## Folder Structure

```
src/
  app/
    (event)/[eventId]/
      page.tsx
      check-in/
      scorer/
      admin/
      share/[matchId]/
    api/
    layout.tsx
  components/
  lib/
  types/
  utils/
```

## Database

Create tables described in `docs/schema.sql` (coming soon) or copy the schema from the project brief.
