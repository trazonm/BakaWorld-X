# Spotify Downloader Setup

This feature allows you to download Spotify tracks in FLAC or MP3 quality using [spotdl](https://github.com/spotDL/spotify-downloader), which uses YouTube Music as the audio source. Inspired by [SuperSPOTDL](https://github.com/Finnapple/SuperSPOTDL).

## How It Works

The downloader:
1. Fetches track metadata from Spotify (title, artist, album, cover art)
2. Downloads audio from YouTube Music (no DRM issues)
3. **Automatically embeds Spotify metadata and album art** into the downloaded file
4. Saves in your chosen format (FLAC lossless or MP3 320kbps)

**Note:** Album art is embedded automatically by spotdl - no additional configuration needed! The cover art will appear in your music player when you open the downloaded files.

## Requirements

### Required: spotdl

Install spotdl using pip:

```bash
pip install spotdl
```

Or with pip3:

```bash
pip3 install spotdl
```

### Optional: Python Script Dependencies

The included Python script (`scripts/spotify_downloader.py`) also uses:

- **requests** and **beautifulsoup4** (for scraping Spotify metadata as fallback):
  ```bash
  pip install requests beautifulsoup4
  ```

### Optional: Spotify API Credentials (Recommended)

For more reliable track metadata, you can set up Spotify API credentials. This is optional - the script will fall back to web scraping if credentials aren't provided.

1. **Get Spotify API credentials:**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Copy your **Client ID** and **Client Secret**

2. **Set environment variables:**
   ```bash
   export SPOTIPY_CLIENT_ID="your_client_id_here"
   export SPOTIPY_CLIENT_SECRET="your_client_secret_here"
   ```

3. **Install spotipy (if using API):**
   ```bash
   pip install spotipy
   ```

   **Note:** The script will automatically use the API if credentials are available, otherwise it will use web scraping (which works but may be less reliable).

## Usage

Once spotdl is installed:

1. Navigate to the "Premiumizer" page
2. Select "Spotify" tab
3. Paste a Spotify track URL (e.g., `https://open.spotify.com/track/...`)
4. Click "Get Info" to fetch track information
5. Select format:
   - **FLAC** - Lossless quality (recommended for audiophiles)
   - **MP3** - 320kbps MP3 (good quality, smaller file size)
6. Click "Download"

## Features

- ✅ Downloads from YouTube Music (no DRM protection)
- ✅ Embeds Spotify metadata (artist, album, title, etc.)
- ✅ Includes album art in downloaded files
- ✅ Supports FLAC (lossless) and MP3 (320kbps)
- ✅ Automatic format conversion
- ✅ Progress tracking during download

## Notes

- Downloads are saved to `temp/spotify/` directory
- The Python script is a fallback if spotdl command-line interface changes
- YouTube Music may have slight variations in audio quality compared to original sources
- Some tracks may not be available on YouTube Music

## Troubleshooting

If you encounter errors:

1. **Ensure spotdl is installed:**
   ```bash
   spotdl --version
   ```

2. **Ensure spotdl is in PATH:**
   ```bash
   which spotdl
   ```

3. **Check Python dependencies:**
   ```bash
   pip list | grep spotdl
   ```

4. **Update spotdl to latest version:**
   ```bash
   pip install --upgrade spotdl
   ```

5. **If Python script fails, verify dependencies:**
   ```bash
   pip list | grep -E "(requests|beautifulsoup4)"
   ```

6. **Check that the Python script is executable:**
   ```bash
   chmod +x scripts/spotify_downloader.py
   ```

## References

- [SuperSPOTDL](https://github.com/Finnapple/SuperSPOTDL) - Original inspiration
- [spotdl](https://github.com/spotDL/spotify-downloader) - The underlying download tool
