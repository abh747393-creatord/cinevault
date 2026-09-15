# CineVault Production Deployment Guide

This guide details the complete production architecture, build instructions, environment configurations, and deployment procedures for **CineVault**.

---

## 1. Production Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CINEVAULT ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

       CLIENT BROWSER (Desktop, Mobile, Tablet)
              │
              ├───► Next.js Frontend (Vercel)
              │     • Edge SSR, Static Optimization, ISR
              │     • Administrative Control Center
              │     • Reusable UI Suite (@devigner-ui/icons)
              │
              ├───► Supabase Cloud
              │     • PostgreSQL Database (Catalog, Profiles, Watch History)
              │     • Authentication (JWT sessions & Role-Based Access Control)
              │
              └───► Rust / Axum Gateway (Render Web Service)
                    • Multi-threaded Tokio daemon
                    • High-performance provider resolution (MovieBox, 4K, BDIX)
                    • Opaque Stream Ticket & Proxy Broker (no leaked secrets)
                    • Dynamic DASH manifest rewriting (<BaseURL>)
```

| Component | Platform | Runtime | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | Next.js 14+ / Node.js 20+ | User Storefront & Admin Portal |
| **Backend** | **Render** | Docker / Linux Debian Slim (Rust 1.85) | Streaming Gateway & Provider Scraper |
| **Database & Auth** | **Supabase** | PostgreSQL 15+ / GoTrue | User data, preferences, catalog sync |

---

## 2. Environment Variables Reference

### Frontend Environment Variables (Vercel)

Configure these in **Vercel Project Settings → Environment Variables**:

| Variable | Required | Production Value (Example) | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_RUST_API_URL` | **Yes** | `https://cinevault-api.onrender.com` | Public URL of the deployed Render Rust daemon (no trailing slash). |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | `https://xyzcompany.supabase.co` | Public Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | `eyJhbGciOiJIUzI1Ni... ...` | Client-safe anonymous publishable key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | `eyJhbGciOiJIUzI1Ni... ...` | Server-side elevated key for administrative DB tasks. |
| `NODE_ENV` | Auto | `production` | Automatically set by Vercel. |

### Backend Environment Variables (Render)

Configure these in **Render Dashboard → Environment**:

| Variable | Required | Production Value (Example) | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | **Yes** | `10000` (or `8080`) | Render automatically injects this. The Axum server binds to `0.0.0.0:$PORT`. |
| `PUBLIC_SERVER_URL` | Recommended | `https://cinevault-api.onrender.com` | The public base URL used in generated stream proxy tickets and DASH manifests. |
| `CORS_ORIGIN` | Recommended | `https://cinevault.vercel.app,http://localhost:3000` | Comma-separated list of allowed origins. Restricts CORS in production. |
| `MOVIEBOX_LOG` | Optional | `info` | Logging level for flexi_logger (`warn`, `info`, `debug`). |

---

## 3. Rust Backend: Local Build & Docker Deployment

The Rust backend source code is located in `moviebox-tui-repo`.

### A. Local Development Build

```bash
# Navigate to the Rust repository
cd moviebox-tui-repo

# Check compilation
cargo check --bin cinevault_server

# Run in development mode (defaults to 0.0.0.0:8080)
cargo run --bin cinevault_server

# Or run with custom PORT and PUBLIC_SERVER_URL
PORT=8080 PUBLIC_SERVER_URL=http://localhost:8080 cargo run --bin cinevault_server
```

### B. Production Release Build (Native Binary)

```bash
cargo build --release --bin cinevault_server
# Optimized binary produced at: target/release/cinevault_server
```

### C. Docker Container Build & Run

A production multi-stage `Dockerfile` is included at `moviebox-tui-repo/Dockerfile`.

```bash
# Build the production Docker image
docker build -t cinevault-rust-api:latest .

# Run container locally on port 8080
docker run -d \
  --name cinevault-api \
  -p 8080:8080 \
  -e PORT=8080 \
  -e PUBLIC_SERVER_URL=http://localhost:8080 \
  -e CORS_ORIGIN=http://localhost:3000 \
  cinevault-rust-api:latest

# Verify health
curl http://localhost:8080/health
```

---

## 4. Deploying the Rust Backend to Render

### Method 1: Connecting Git Repository (Recommended)

1. Push `moviebox-tui-repo` to GitHub (or your Git provider).
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Web Service**.
4. Connect your repository.
5. Configure the service settings:
   - **Name**: `cinevault-rust-api`
   - **Region**: Select closest to your users (e.g. `Oregon` or `Frankfurt`).
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: `Starter` (recommended for streaming concurrency) or `Free`.
6. Under **Advanced → Health Check Path**, set:
   ```
   /health
   ```
7. Add Environment Variables:
   - `PORT`: `10000`
   - `PUBLIC_SERVER_URL`: `https://<your-render-subdomain>.onrender.com`
   - `CORS_ORIGIN`: `https://<your-vercel-domain>.vercel.app,http://localhost:3000`
8. Click **Create Web Service**. Render will automatically build the multi-stage Docker image and deploy.

### Method 2: Render Blueprint (`render.yaml`)

A `render.yaml` specification is provided. In Render, select **New +** → **Blueprint** and point to your repository.

---

## 5. Deploying the Next.js Frontend to Vercel

1. Push `lucid-chandrasekhar` to GitHub.
2. Log in to [Vercel Dashboard](https://vercel.com).
3. Click **Add New...** → **Project**.
4. Import your repository.
5. In **Configure Project**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (or `next build`)
   - **Output Directory**: `.next`
6. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_RUST_API_URL`: Your Render service URL (e.g. `https://cinevault-api.onrender.com`).
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key.
7. Click **Deploy**.

---

## 6. Supabase Database Configuration

Ensure your Supabase project contains the following tables:

1. **`profiles`**:
   - `id` (uuid, primary key, references auth.users)
   - `username` (text)
   - `display_name` (text)
   - `role` (text, default 'user')
   - `avatar_url` (text)
   - `preferred_language` (text)
   - `default_quality` (text)
   - `created_at` (timestamptz)

2. **`content`**:
   - `id` (uuid, primary key)
   - `external_id` (text)
   - `content_type` (text: 'movie' | 'tv' | 'anime')
   - `title` (text)
   - `slug` (text, unique)
   - `description` (text)
   - `poster_url` (text)
   - `backdrop_url` (text)
   - `year` (int4)
   - `rating` (numeric)
   - `quality` (text)
   - `created_at` (timestamptz)

3. **Admin User Setup**:
   To grant admin privileges to a user, update their role in the `profiles` table:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = '<USER_UUID>';
   ```

---

## 7. Health Checks & Verification

### Test 1: Lightweight Health Endpoint
```bash
curl -I https://cinevault-api.onrender.com/health
```
Expected Response:
```http
HTTP/1.1 200 OK
content-type: application/json
```
Body:
```json
{
  "status": "healthy",
  "version": "0.1.18",
  "service": "cinevault_server"
}
```

### Test 2: Full API Health & Provider Cascade
```bash
curl https://cinevault-api.onrender.com/api/v1/health
```
Expected Response:
```json
{
  "status": "ok",
  "version": "0.1.18",
  "providers": ["moviebox", "fourkhdhub", "circleftp", "dhakaflix", "addons"]
}
```

### Test 3: Provider Search
```bash
curl "https://cinevault-api.onrender.com/api/v1/search?q=Inception"
```

### Test 4: Stream Resolution & Proxy Verification
```bash
# Check stream ticket resolution
curl "https://cinevault-api.onrender.com/api/v1/streams/1111774575987245152"
```
Verify that `proxy_url` starts with `https://cinevault-api.onrender.com/api/v1/stream/proxy/...` rather than `localhost`.

---

## 8. Security & Compliance Checklist

- [x] **No hardcoded secrets**: Docker images contain zero API keys, tokens, or credentials.
- [x] **Upstream token isolation**: Upstream scraping headers, tokens, and cookies are resolved on the Rust server and never exposed to the client.
- [x] **Opaque stream tickets**: Clients only receive temporary, server-validated proxy ticket URLs with 4-hour automatic expiration.
- [x] **CORS restriction**: Production traffic is gated by `CORS_ORIGIN`.
- [x] **Zero production localhost dependencies**: Dynamic base URLs ensure that all DASH manifests and streams resolve to the public production domain.
- [x] **Non-root container user**: The Docker container runs as unprivileged user `cinevault`.
