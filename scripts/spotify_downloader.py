#!/usr/bin/env python3
"""
Spotify Downloader - Downloads Spotify tracks using spotdl (YouTube Music as source)
Inspired by SuperSPOTDL: https://github.com/Finnapple/SuperSPOTDL
Uses spotdl which downloads from YouTube Music and embeds Spotify metadata
"""

import sys
import json
import subprocess
import os
import re
from pathlib import Path

# Load environment variables from .env file if available
try:
    from dotenv import load_dotenv
    # Try to load .env from project root (parent of scripts directory)
    script_dir = Path(__file__).parent
    env_file = script_dir.parent / '.env'
    if env_file.exists():
        load_dotenv(env_file)
except ImportError:
    # python-dotenv not installed, skip loading .env file
    pass

def find_command(cmd):
    """Find if command exists in PATH"""
    try:
        result = subprocess.run(['which', cmd], capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return None

def extract_spotify_track_id(url):
    """Extract track ID from Spotify URL"""
    patterns = [
        r'spotify\.com/track/([a-zA-Z0-9]+)',
        r'spotify:track:([a-zA-Z0-9]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_spotify_track_info(url):
    """Extract Spotify track information using Spotify API or scraping"""
    # Try Spotify API first if credentials are available
    track_info = get_spotify_track_info_api(url)
    if track_info:
        return track_info
    
    # Fallback: scrape Spotify web page
    return get_spotify_track_info_scrape(url)

def get_spotify_track_info_api(url):
    """Get track info using Spotify Web API (requires credentials)"""
    try:
        import os
        import spotipy
        from spotipy.oauth2 import SpotifyClientCredentials
        
        # Check for credentials in environment variables
        client_id = os.getenv('SPOTIPY_CLIENT_ID')
        client_secret = os.getenv('SPOTIPY_CLIENT_SECRET')
        
        if not client_id or not client_secret:
            return None
        
        track_id = extract_spotify_track_id(url)
        if not track_id:
            return None
        
        # Authenticate with Spotify API
        client_credentials_manager = SpotifyClientCredentials(
            client_id=client_id,
            client_secret=client_secret
        )
        sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)
        
        # Get track info
        track = sp.track(track_id)
        
        return {
            'id': track['id'],
            'title': track['name'],
            'artist': track['artists'][0]['name'] if track['artists'] else 'Unknown Artist',
            'artists': [artist['name'] for artist in track['artists']],
            'album': track['album']['name'] if track['album'] else 'Unknown Album',
            'duration': track['duration_ms'] // 1000,
            'albumArt': track['album']['images'][0]['url'] if track['album'].get('images') else ''
        }
    except ImportError:
        # spotipy not installed
        return None
    except Exception as e:
        # API call failed, fall back to scraping
        return None

def get_spotify_track_info_scrape(url):
    """Fallback: Scrape Spotify web page for track info"""
    try:
        import requests
        from bs4 import BeautifulSoup
        
        track_id = extract_spotify_track_id(url)
        if not track_id:
            return None
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers)
        
        if response.ok:
            soup = BeautifulSoup(response.content, 'html.parser')
            title = soup.find('meta', property='og:title')
            description = soup.find('meta', property='og:description')
            image = soup.find('meta', property='og:image')
            
            # Try JSON-LD first (more reliable)
            json_ld = soup.find('script', type='application/ld+json')
            json_ld_data = None
            if json_ld:
                try:
                    json_ld_data = json.loads(json_ld.string)
                    if '@type' in json_ld_data and isinstance(json_ld_data.get('@type'), list) and 'MusicRecording' in json_ld_data['@type']:
                        artist_data = json_ld_data.get('byArtist', {})
                        if isinstance(artist_data, dict) and artist_data.get('name'):
                            artist_name = artist_data.get('name')
                            album_data = json_ld_data.get('inAlbum', {})
                            album_name = album_data.get('name', 'Unknown Album') if isinstance(album_data, dict) else 'Unknown Album'
                            
                            # Only return if we have valid artist and album
                            if artist_name and artist_name != 'Unknown Artist':
                                return {
                                    'id': track_id,
                                    'title': json_ld_data.get('name', 'Unknown Track'),
                                    'artist': artist_name,
                                    'artists': [artist_name],
                                    'album': album_name,
                                    'duration': 0,
                                    'albumArt': json_ld_data.get('image', '') if json_ld_data.get('image') else (image.get('content', '') if image else '')
                                }
                except:
                    pass
            
            if title:
                title_text = title.get('content', 'Unknown Track')
                
                # Parse track name - remove version suffixes like " - EP Version", " - Remastered", etc.
                # But keep artist separators like "Artist - Track"
                track_name = title_text
                if ' - ' in title_text:
                    # Check if it's a version suffix (common patterns)
                    version_patterns = [' - EP Version', ' - Remastered', ' - Remaster', ' - Single Version', 
                                       ' - Album Version', ' - Explicit', ' - Clean']
                    for pattern in version_patterns:
                        if title_text.endswith(pattern):
                            track_name = title_text[:-len(pattern)].strip()
                            break
                    # If no version pattern, might be "Artist - Track" format
                    # We'll extract from description instead
                
                # Get artist and album from description (format: "Artist · Album · Song/Type · Year")
                artist_name = 'Unknown Artist'
                album_name = 'Unknown Album'
                if description:
                    desc = description.get('content', '')
                    # Description format: "Artist · Album · Song/Type · Year"
                    if ' · ' in desc:
                        parts = [p.strip() for p in desc.split(' · ')]
                        if len(parts) >= 1 and parts[0]:
                            artist_name = parts[0]
                        if len(parts) >= 2 and parts[1]:
                            album_name = parts[1]
                
                # Also try to extract from JSON-LD description if available
                if json_ld:
                    try:
                        data = json.loads(json_ld.string)
                        desc_text = data.get('description', '')
                        if desc_text and ' · ' in desc_text:
                            parts = [p.strip() for p in desc_text.split(' · ')]
                            if len(parts) >= 1 and parts[0] and artist_name == 'Unknown Artist':
                                # Extract artist name (format: "Listen to Track on Spotify. Song · Artist · Year")
                                # Or just "Artist · Album · Year"
                                for part in parts:
                                    if part and part not in ['Song', 'Track', 'Album', 'EP', 'Single']:
                                        if artist_name == 'Unknown Artist':
                                            artist_name = part
                                        elif album_name == 'Unknown Album' and part != artist_name:
                                            album_name = part
                                            break
                    except:
                        pass
                
                return {
                    'id': track_id,
                    'title': track_name.strip(),
                    'artist': artist_name.strip() if artist_name != 'Unknown Artist' else 'Unknown Artist',
                    'artists': [artist_name.strip()] if artist_name != 'Unknown Artist' else ['Unknown Artist'],
                    'album': album_name.strip() if album_name != 'Unknown Album' else 'Unknown Album',
                    'duration': 0,
                    'albumArt': image.get('content', '') if image else ''
                }
    except Exception as e:
        print(f"Error scraping track info: {e}", file=sys.stderr)
    
    return None

def download_from_spotify(url, output_dir, format='flac'):
    """Download track from Spotify using spotdl (YouTube Music as source)"""
    try:
        spotdl = find_command('spotdl')
        if not spotdl:
            raise Exception("spotdl not found. Please install spotdl: pip install spotdl")
        
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Build spotdl command
        # spotdl downloads from YouTube Music and embeds Spotify metadata (including album art)
        # Album art is embedded automatically by default - only use --skip-album-art to disable
        args = [
            spotdl,
            url,
            '--output', str(output_path),
            '--format', format,
            '--threads', '4'
        ]
        
        if format == 'flac':
            args.extend(['--bitrate', '0'])  # Highest quality
        elif format == 'mp3':
            args.extend(['--bitrate', '320k'])  # 320kbps MP3
        
        # Run spotdl
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            cwd=str(output_path)
        )
        
        if result.returncode == 0:
            # Find downloaded file - spotdl downloads with artist - title format
            for file in output_path.iterdir():
                ext = f'.{format}'
                if file.suffix == ext:
                    return str(file)
            
            raise Exception("Downloaded file not found")
        
        raise Exception(f"spotdl failed: {result.stderr}")
    except Exception as e:
        print(f"Error downloading from Spotify: {e}", file=sys.stderr)
        raise

def main():
    """Main function"""
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: spotify_downloader.py <action> <url> [options]'}), file=sys.stderr)
        sys.exit(1)
    
    action = sys.argv[1]
    url = sys.argv[2]
    
    try:
        if action == 'info':
            info = get_spotify_track_info(url)
            if info:
                print(json.dumps(info))
            else:
                print(json.dumps({'error': 'Failed to get track info'}), file=sys.stderr)
                sys.exit(1)
        
        elif action == 'download':
            if len(sys.argv) < 5:
                print(json.dumps({'error': 'Usage: download <url> <format> <output_dir>'}), file=sys.stderr)
                sys.exit(1)
            
            format = sys.argv[3]  # flac, mp3, etc.
            output_dir = sys.argv[4]
            
            # Download using spotdl
            file_path = download_from_spotify(url, output_dir, format)
            print(json.dumps({'success': True, 'file': file_path}))
        
        else:
            print(json.dumps({'error': f'Unknown action: {action}'}), file=sys.stderr)
            sys.exit(1)
    
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
