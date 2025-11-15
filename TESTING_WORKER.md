# Testing the Worker Locally

This guide explains how to test the backend worker service locally, both standalone and with Docker.

## Prerequisites

1. **PostgreSQL database** running and accessible
2. **Real-Debrid API token** configured
3. **Node.js** (v20+) and **pnpm** installed
4. At least one user with active downloads in the database

## Option 1: Run Worker Standalone (Recommended for Testing)

### Step 1: Install Dependencies

```bash
pnpm install
```

This will install `tsx` which is needed to run TypeScript files directly.

### Step 2: Set Up Environment Variables

Make sure your `.env` file has the required variables:

```env
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bakaworld
DB_USER=your_username
DB_PASSWORD=your_password

# Real-Debrid API (required)
REAL_DEBRID_AUTH=your_realdebrid_api_key

# Optional: Customize poll interval (default: 30000ms = 30 seconds)
POLL_INTERVAL=10000  # 10 seconds for faster testing
```

### Step 3: Run the Worker

**Normal mode** (polling every 30 seconds by default):
```bash
pnpm worker
```

**Watch mode** (auto-restart on file changes - great for development):
```bash
pnpm worker:dev
```

**With custom poll interval** (10 seconds for faster testing):
```bash
POLL_INTERVAL=10000 pnpm worker
```

### Step 4: Verify It's Working

You should see output like this:

```
[2024-01-15T10:30:00.000Z] 🚀 Starting download worker service...
[2024-01-15T10:30:00.100Z] ⏱️  Poll interval: 10 seconds
[2024-01-15T10:30:00.200Z] 💾 Database: localhost:5432/bakaworld
[2024-01-15T10:30:00.300Z] ✅ Worker initialized successfully
[2024-01-15T10:30:05.500Z] 🔄 Starting poll cycle #1 - 2 user(s), 3 active download(s)
[2024-01-15T10:30:07.200Z] 📈 [user1] Movie.mkv: 45% → 52%
[2024-01-15T10:30:09.100Z] ✅ Cycle #1 completed in 3.60s | 📊 Completed: 0 | Removed: 0 | Errors: 0
```

### What to Look For

✅ **Success indicators:**
- Worker starts without errors
- Database connection successful
- Poll cycles start and complete
- Progress updates appear for active downloads
- Cycle summaries show timing and statistics

❌ **Common issues:**
- **Database connection errors**: Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
- **No users with downloads**: Add some downloads through the web interface first
- **REAL_DEBRID_AUTH errors**: Make sure your API token is valid

## Option 2: Test with Main Application Running

You can run both the frontend and worker simultaneously:

### Terminal 1: Start the frontend
```bash
pnpm dev
```

### Terminal 2: Start the worker
```bash
pnpm worker:dev
```

This lets you:
1. Add downloads through the web UI
2. Watch the worker poll and update them in real-time
3. See progress updates both in the UI and worker logs

## Option 3: Test with Docker Compose

### Step 1: Ensure your `.env` file is configured

Make sure all environment variables are set, especially:
- Database connection settings
- REAL_DEBRID_AUTH
- Other required API keys

### Step 2: Start all services

```bash
docker-compose up --build
```

This will start both the frontend and backend worker containers.

### Step 3: View worker logs

**View all logs:**
```bash
docker-compose logs -f
```

**View only worker logs:**
```bash
docker-compose logs -f backend
```

**View logs for specific service:**
```bash
# Frontend logs
docker-compose logs -f frontend

# Backend worker logs
docker-compose logs -f backend
```

### Step 4: Monitor worker activity

The worker container logs will show the same formatted output as standalone mode. Watch for:
- Poll cycles starting
- Progress updates
- Completed downloads
- Error messages (if any)

### Step 5: Stop services

```bash
docker-compose down
```

## Testing Scenarios

### Test 1: Basic Functionality

1. Start the worker
2. Ensure you have at least one user with active downloads (< 100% progress)
3. Watch the logs for poll cycles
4. Verify progress updates appear

### Test 2: Completion Handling

1. Add a download that's close to completion (>90%)
2. Start the worker with a short poll interval (10 seconds)
3. Watch for completion message: `✅ [username] Download completed: filename`
4. Verify the link gets unrestricted automatically

### Test 3: Error Handling

1. Add a download with an invalid ID (or delete it from Real-Debrid)
2. Watch for removal message: `🗑️ [username] Removing missing torrent: filename`
3. Verify it gets cleaned up from the database

### Test 4: Performance

1. Add multiple downloads across multiple users
2. Watch the cycle summary for timing
3. Verify parallel processing (users processed concurrently)
4. Check that cycle time scales reasonably

### Test 5: Graceful Shutdown

1. Start the worker
2. Press `Ctrl+C` to send SIGINT
3. Verify it waits for current cycle to complete
4. Check for clean shutdown message: `✅ Worker shut down successfully`

## Quick Test Script

Here's a quick way to verify everything works:

```bash
# 1. Install dependencies
pnpm install

# 2. Run worker with fast polling (10 seconds)
POLL_INTERVAL=10000 pnpm worker

# In another terminal, check if database has users with downloads:
psql -h localhost -U your_username -d bakaworld -c "SELECT username, jsonb_array_length(downloads) as download_count FROM users WHERE downloads IS NOT NULL AND jsonb_array_length(downloads) > 0;"
```

## Expected Output

### Startup
```
[timestamp] 🚀 Starting download worker service...
[timestamp] ⏱️  Poll interval: 10 seconds
[timestamp] 💾 Database: localhost:5432/bakaworld
[timestamp] ✅ Worker initialized successfully
```

### During Polling
```
[timestamp] 🔄 Starting poll cycle #1 - 2 user(s), 3 active download(s)
[timestamp] 📈 [user1] Movie.mkv: 45% → 52%
[timestamp] ✅ [user2] Episode 05.mp4: Download completed
[timestamp] ✅ Cycle #1 completed in 3.45s | 📊 Completed: 1 | Removed: 0 | Errors: 0
```

### Periodic Stats (every 10 cycles)
```
[timestamp] 📈 Stats (last 10 cycles): 5 completed, 2 removed, 0 errors | Avg cycle time: 3.20s
```

## Troubleshooting

### Worker won't start
- Check database connection: `psql -h localhost -U your_username -d bakaworld`
- Verify REAL_DEBRID_AUTH is set: `echo $REAL_DEBRID_AUTH`
- Check for TypeScript errors: `pnpm check`

### No downloads being polled
- Verify users have downloads: Check database directly
- Make sure downloads have `progress < 100`
- Check that downloads have valid `id` field

### Database connection errors
- Verify PostgreSQL is running: `pg_isready`
- Check connection settings match your database
- Try connecting manually: `psql -h localhost -U your_username -d bakaworld`

### Rate limiting issues
- Real-Debrid has a 250 requests/minute limit
- The service handles this automatically, but you may see wait messages
- If you see frequent rate limit errors, increase POLL_INTERVAL

