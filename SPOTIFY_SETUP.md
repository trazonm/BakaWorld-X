# Spotify downloads (YouTube-backed)

The app does **not** use Spotify’s DRM streams or a Deezer account. It follows the same idea as **SpotDL**: read **public track metadata** from Spotify, pick the top **YouTube** search hit, then download audio with **yt-dlp** and encode with **ffmpeg** (already installed in the Docker image).

## What you need

1. **yt-dlp** and **ffmpeg** on the server (Dockerfile installs both).
2. **Optional — free Spotify Developer app**  
   Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) (no Premium required). Add to `.env`:

   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`

   These use the **Client Credentials** flow for `GET /v1/tracks/{id}` (slightly richer metadata than the embed fallback).

3. **If you skip (2)**  
   The app reads the public **embed** page (`open.spotify.com/embed/track/…`) and parses **`__NEXT_DATA__`** so you still get **artist + title + cover** for YouTube search, without API keys. If that ever breaks, it falls back to **oEmbed** (title only).

## Output formats

- **MP3 128** / **MP3 320** — `libmp3lame` after `bestaudio`.
- **FLAC** — lossless **container**; the underlying source is still typically **lossy** (YouTube), so this is not “true studio FLAC” like a CD rip.

## Limits

- Match quality depends on YouTube search; wrong uploads, covers, or topic mismatches can happen (especially without Client ID/Secret).
- **Region / age / geo-blocked** videos behave like any yt-dlp download.

## “HTTP Error 403: Forbidden” from yt-dlp

YouTube blocks some clients or IP ranges. This app already tries several **`player_client`** modes (`android,web` → `tv_embedded` → `web_embedded`). If you still see **403**:

1. **Upgrade yt-dlp** (critical): `brew upgrade yt-dlp` on macOS, or `pip install -U yt-dlp`, or rebuild the Docker image (the Dockerfile installs yt-dlp from **pip** so it stays current).
2. **`YT_DLP_COOKIES`**: path to a **Netscape-format cookies.txt** exported from a browser where YouTube plays while logged in (optional but often fixes stubborn 403s). Use an **absolute** path, or a path relative to the project root.
3. **Advanced:** set **`YT_DLP_YOUTUBE_EXTRACTOR_ARGS`** to a single override string, e.g. `youtube:player_client=android,web` (see [yt-dlp YouTube extractor args](https://github.com/yt-dlp/yt-dlp#youtube)).
