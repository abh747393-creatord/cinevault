# CineVault - Modern Movie & TV Streaming Discovery Platform

CineVault is a modern, responsive streaming discovery and HTML5 video playback platform inspired by modern entertainment services (such as Netflix and MovieBox-TUI) but re-imagined for the web with an original brand identity, strict security, and a modular content provider architecture.

Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL with Row Level Security)**.

---

## 🌟 Key Features

### 1. Cinematic Streaming Experience
- **Cinematic Hero Banner**: Auto-rotating hero featuring prominent movies/shows, detailed badges (4K, age ratings, IMDb rating), synopsis, and direct playback controls.
- **Horizontal Carousels**: Netflix-style smooth horizontal rows for *Trending Now*, *Latest Movies*, *Latest TV Shows*, *Popular Anime*, *Recommended For You*, and genre collections.
- **Detailed Metadata Pages**: Dedicated movie (`/movie/[slug]`) and TV show (`/tv/[slug]`) hubs displaying backdrops, posters, cast members, directors, release years, runtimes, and genre tags.
- **Multi-Season TV & Anime Navigation**: Tabbed season pickers (`Season 1`, `Season 2`) with episode thumbnail grids, runtimes, synopses, and watched indicators.

### 2. Custom HTML5 Browser Video Player
- **Desktop Keyboard Shortcuts**:
  - `Space` / `K`: Play / Pause
  - `F`: Toggle Fullscreen
  - `M`: Toggle Mute
  - `←` / `→`: Seek backward / forward 10 seconds
  - `↑` / `↓`: Volume up / down
  - `Esc`: Exit fullscreen
- **Playback Controls**: Seek scrubber with hover preview, speed selector (0.5x – 2x), resolution switcher (1080p, 720p, 480p), and Picture-in-Picture (PiP).
- **Subtitles & Audio**: WebVTT subtitle track selector and multi-language audio track options.
- **TV Episode Drawer**: Seamlessly switch between episodes and seasons within the player without exiting.

### 3. Continue Watching & Watch Progress
- Periodically tracks playback position (every 10 seconds and on pause/unload).
- Automatically marks titles as `completed` when $\ge 90\%$ watched.
- Features a **Continue Watching** card row with visual progress percentage indicators and instant resume buttons.

### 4. Watchlist & History
- **My List (`/my-list`)**: Save favorite titles with instant toggle and filter by Movies, TV Shows, and Anime.
- **Watch History (`/history`)**: Chronological viewing log with exact timestamps, percentage completed, and clear-history controls.

### 5. Instant Global Search
- Real-time debounced search bar (`/search?q=...`) across movies, TV series, anime, actors, and genres.
- Categorized result tabs with instant search term suggestions.

### 6. Modular Content Provider Architecture
- Decouples frontend components from external content sources via `ContentProvider` interface (`lib/providers/provider-interface.ts`).
- Prioritized fallback resolver:
  $$\text{Local Database (Supabase)} \longrightarrow \text{Open Cinema Archive} \longrightarrow \text{External Adapters}$$
- Server-side stream resolution (`/api/stream/[contentId]`) ensures private API keys and credentials are never leaked to the browser.
- Ships with legally permissible open-source and public-domain cinema productions (*Tears of Steel*, *Sintel*, *Big Buck Bunny*, *Cosmos Laundromat*, *Charge*, *Spring*, *Elephants Dream*, and episodic series).

### 7. Supabase Database & Security (RLS)
- SQL migrations in `supabase/migrations/`:
  - `001_initial_schema.sql`: Full schema with relational tables, foreign keys, and performance indexes.
  - `002_rls_policies.sql`: Row Level Security policies enforcing data isolation.
  - `003_seed_data.sql`: Production seed data.
- User data isolation: Users can only read/write their own watch history, watchlist, and profile.
- Server-only service role client prevents privilege escalation.

### 8. Admin Dashboard (`/admin`)
- Restricted to users with the `admin` role.
- Real-time system telemetry and provider pipeline health.
- Content manager: create new titles, feature items, or remove records.
- Provider manager: enable/disable adapters and adjust priorities.
- User management and genre administration.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node v24)
- npm or pnpm

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your Supabase credentials (optional for initial local testing; CineVault includes a built-in persistent demo fallback):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```text
├── app/
│   ├── page.tsx                      # Cinematic Homepage
│   ├── movies/page.tsx               # Movies Catalog & Filters
│   ├── tv/page.tsx                   # TV Shows Catalog & Filters
│   ├── anime/page.tsx                # Anime Hub & Dub/Sub Indicators
│   ├── search/page.tsx               # Global Debounced Search
│   ├── movie/[slug]/page.tsx         # Movie Details
│   ├── tv/[slug]/page.tsx            # TV Show Details & Episode Picker
│   ├── watch/
│   │   ├── movie/[id]/page.tsx       # Movie HTML5 Player
│   │   └── tv/[id]/[episode]/page.tsx# TV Episode Player & Drawer
│   ├── my-list/page.tsx              # User Watchlist
│   ├── history/page.tsx              # Watch History
│   ├── profile/page.tsx              # User Profile & Stats
│   ├── settings/page.tsx             # User Preferences
│   ├── admin/page.tsx                # Admin Control Center
│   ├── login/page.tsx                # Sign In
│   ├── signup/page.tsx               # Sign Up
│   └── api/
│       ├── stream/[contentId]/       # Secure Server Stream Resolver
│       └── progress/                 # Watch Progress Sync
├── components/
│   ├── navbar/                       # Desktop & Mobile Navigation
│   ├── hero/                         # Hero Banner Carousel
│   ├── cards/                        # Content, Continue Watching & Episode Cards
│   ├── rows/                         # Smooth-scroll Horizontal Carousels
│   ├── player/                       # Video Player & Episode Drawer
│   ├── search/                       # Search Bar
│   ├── filters/                      # Genre, Year & Sort Panels
│   └── share/                        # Social Share Modal
├── lib/
│   ├── supabase/                     # Supabase Client, Server & Admin helpers
│   ├── providers/                    # Modular Provider Adapter Architecture
│   ├── auth/                         # React Authentication Context
│   └── storage/                      # Browser Persistence Store (Demo Mode)
└── supabase/
    └── migrations/                   # PostgreSQL Schema & RLS SQL Scripts
```

---

## 🔒 Security & Compliance
- **Zero API Key Leakage**: Provider API keys (`TMDB_API_KEY`, etc.) and `SUPABASE_SERVICE_ROLE_KEY` are only ever accessed on the server.
- **Row Level Security**: Direct table access via client Supabase keys is strictly scoped to `auth.uid() = user_id`.
- **Legal Content Sourcing**: Strictly utilizes authorized public-domain and Creative Commons certified media.
