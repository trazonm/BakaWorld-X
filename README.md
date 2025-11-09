# 🎌 BakaWorld χ

**A modern anime, manga, and comics platform with integrated torrent management**

BakaWorld χ is a full-stack web application built with SvelteKit that provides streaming, reading, and torrent management capabilities. Features Real-Debrid integration, Jackett torrent search, and a modern anime-inspired UI with dual theme support.

## ✨ Features

### 🎥 **Anime Streaming**
- **Embedded video player** with reliable streaming
- **Language options** - Switch between subbed and dubbed versions
- **Episode navigation** with previous/next episode controls
- **Full episode listings** with metadata (sub/dub/filler indicators)
- **Responsive player** that works on all devices
- **Anime details** with genres, synopsis, and related series
- **Direct streaming** without ads or interruptions

### 📚 **Manga & Comics Reading**
- **Chapter-based reading** with smooth page navigation
- **Multiple sources** for manga and comics
- **Progress tracking** and bookmarking
- **Previous/next chapter navigation**
- **Responsive reader** optimized for all devices

### 🌊 **Torrent Management**
- **Integrated Jackett search** with multiple indexer support
- **Real-Debrid integration** for instant streaming
- **Live download progress** with WebSocket updates
- **Torrent queueing** and batch operations
- **Automatic status tracking** and history
- **Smart duplicate detection** and management

### 📱 **User Interface**
- **Dual theme system**: 
  - 🌙 **Dark Mode** - Blue/cyan color scheme for comfortable viewing
  - 🌑 **Midnight Mode** - Neon pink/purple/navy for an anime-inspired aesthetic
- **Responsive design** that works seamlessly on all devices
- **Modern UI components** using Tailwind CSS
- **PWA support** with offline capabilities
- **Keyboard shortcuts** for power users
- **Animated homepage** with dynamic effects

### 🔍 **Search & Discovery**
- **Universal search** across anime, manga, and comics
- **Torrent search** with filtering by seeders and size
- **Real-time results** with instant feedback
- **Advanced sorting** by title, size, and seeders
- **Detailed metadata** display for all content

### 🔐 **Authentication & Security**
- **JWT-based authentication** with secure session management
- **User registration and login** system
- **Password hashing** with bcrypt
- **Protected routes** and API endpoints
- **Secure API proxy** for external services

### 🛠️ **Technical Features**
- **Server-side rendering (SSR)** for optimal performance
- **Progressive Web App (PWA)** with offline support and installability
- **Real-time updates** via WebSocket connections
- **PostgreSQL database** with optimized queries
- **TypeScript** for type safety throughout
- **Modern build system** with Vite and SvelteKit
- **Docker support** for easy deployment
- **Responsive caching** for improved performance

## 🚀 Quick Start

### Option 1: Docker (Recommended)

**Prerequisites:**
- Docker and Docker Compose installed
- Real-Debrid account (for torrent features)
- Jackett server (for torrent search)

**Installation:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/trazonm/BakaWorld-X.git
   cd BakaWorld-X
   ```

2. **Set up environment variables**
   Copy the example environment file and edit it:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database (for Docker, these will connect to the postgres service)
   DB_HOST=postgres
   DB_PORT=5432
   DB_NAME=bakaworld
   DB_USER=bakaworld
   DB_PASSWORD=your_secure_password

   # JWT Secret (generate a strong random string)
   JWT_SECRET=your_super_secret_jwt_key_change_this

   # Real-Debrid API (get from https://real-debrid.com/apitoken)
   REAL_DEBRID_AUTH=your_realdebrid_api_key

   # Jackett API (required for torrent search)
   JACKETT_API_KEY=your_jackett_api_key
   JACKETT_URL=http://your-jackett-server:9117

   # Application Port
   PORT=3000
   
   # Public URL (for PWA)
   PUBLIC_ORIGIN=http://localhost:3000
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   Navigate to `http://localhost:3000`
   
5. **Create an account**
   Register a new user on the login page

**Docker Commands:**
- View logs: `docker-compose logs -f app`
- Stop services: `docker-compose down`
- Stop and remove volumes: `docker-compose down -v`
- Rebuild after changes: `docker-compose up -d --build`

### Option 2: Local Development

**Prerequisites:**
- **Node.js** (v20 or higher)
- **pnpm** (recommended) or npm
- **PostgreSQL** database (v14 or higher)
- **Real-Debrid account** (get from https://real-debrid.com)
- **Jackett server** (for torrent search - https://github.com/Jackett/Jackett)

**Installation:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/trazonm/BakaWorld-X.git
   cd BakaWorld-X
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb bakaworld
   
   # The app will create tables automatically on first run
   ```

4. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=bakaworld
   DB_USER=your_username
   DB_PASSWORD=your_password

   # JWT Secret (generate a strong random string)
   JWT_SECRET=your_super_secret_jwt_key

   # Real-Debrid API
   REAL_DEBRID_AUTH=your_realdebrid_api_key

   # Jackett API
   JACKETT_API_KEY=your_jackett_api_key
   JACKETT_URL=http://localhost:9117
   
   # Public URL
   PUBLIC_ORIGIN=http://localhost:5173
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`
   
7. **Register an account**
   Create a new user account to get started

## 📦 Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build production version |
| `pnpm preview` | Preview production build locally |
| `pnpm check` | Run TypeScript and Svelte checks |
| `pnpm check:watch` | Run checks in watch mode |
| `pnpm format` | Format code with Prettier |
| `pnpm lint` | Lint and check formatting |

## 🏗️ Project Structure

```
src/
├── lib/                     # Reusable library code
│   ├── components/         # UI Components (modals, forms, players, etc.)
│   ├── composables/        # Reusable logic hooks (torrent manager, etc.)
│   ├── config/            # App configuration
│   ├── constants/         # Application constants
│   ├── server/            # Server-side utilities (database, auth)
│   ├── services/          # External API services (Real-Debrid, Jackett)
│   ├── stores/            # Svelte stores (auth, theme, UI state)
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── validators/        # Input validation schemas
├── routes/                 # SvelteKit routes (file-based routing)
│   ├── api/               # API endpoints
│   │   ├── auth/         # Authentication (login, register, logout)
│   │   ├── anime/        # Anime streaming endpoints
│   │   ├── manga/        # Manga reading endpoints
│   │   ├── comics/       # Comics reading endpoints
│   │   ├── downloads/    # Download management
│   │   ├── proxy/        # Media proxy services
│   │   ├── search/       # Search functionality
│   │   └── torrents/     # Torrent operations (add, status, poll)
│   ├── anime/            # Anime browsing and watching pages
│   ├── manga/            # Manga browsing and reading pages
│   ├── comics/           # Comics browsing and reading pages
│   ├── downloads/        # Downloads management page
│   ├── home/             # Animated homepage with torrent search
│   └── +layout.svelte    # Root layout with navigation
└── static/               # Static assets (icons, manifests, images)
```

## 🛠️ Tech Stack

### **Frontend**
- **SvelteKit 2** - Full-stack framework with SSR
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Utility-first styling
- **Svelte 5** - Latest reactive framework
- **Plyr** - Modern video player
- **HLS.js** - HTTP Live Streaming support

### **Backend**
- **SvelteKit API Routes** - Server-side logic
- **PostgreSQL** - Primary database with `pg` driver
- **JWT** - Secure authentication tokens
- **bcrypt** - Password hashing and security
- **Node.js** - Runtime environment

### **External Integrations**
- **Real-Debrid API** - Premium link generation and torrent caching
- **Jackett** - Multi-indexer torrent search aggregation
- **Multiple Content APIs** - Anime, manga, and comics metadata

### **Development & Deployment**
- **Vite** - Lightning-fast build tool and dev server
- **Docker** - Containerization with Docker Compose
- **pnpm** - Fast, efficient package manager
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **svelte-check** - TypeScript and Svelte validation

## 🎮 Usage

### **Watching Anime**
1. Click **Anime** in the navigation
2. Search for your favorite anime series
3. Click on an anime to view details and episode list
4. Select an episode to start watching
5. Toggle between **Subbed** and **Dubbed** using the language selector
6. Navigate episodes using Previous/Next buttons
7. Use the embedded player controls:
   - Click/tap to play/pause
   - Fullscreen button for immersive viewing
   - Volume and playback controls
   - Episode info and navigation at the bottom

### **Reading Manga/Comics**
1. Navigate to **Manga** or **Comics**
2. Search for your favorite series
3. Select a chapter to read
4. Use navigation controls or keyboard:
   - `←/→` - Previous/Next page
   - `Esc` - Back to chapter list

### **Managing Torrents & Downloads**
1. Go to the **Home** page for torrent search
2. Search for content using the integrated Jackett search
3. Click "Add to Queue" to send torrents to Real-Debrid
4. Navigate to **Downloads** to monitor progress
5. Live updates show download status in real-time
6. Completed downloads are automatically tracked

### **Customizing Your Experience**
- **Theme Toggle**: Click the sun/moon icon to switch between:
  - 🌙 **Dark Mode** - Blue/cyan color scheme
  - 🌑 **Midnight Mode** - Neon pink/purple/navy anime aesthetic
- **PWA Installation**: Install as an app for offline access
- **Keyboard Shortcuts**: Use shortcuts throughout the app for efficiency

## 🔧 Configuration

### **Environment Variables**
All sensitive configuration is handled through environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_HOST` | PostgreSQL host | Yes |
| `DB_PORT` | PostgreSQL port (default: 5432) | Yes |
| `DB_NAME` | Database name | Yes |
| `DB_USER` | Database user | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `REAL_DEBRID_AUTH` | Real-Debrid API key | Yes |
| `JACKETT_API_KEY` | Jackett API key | Yes |
| `JACKETT_URL` | Jackett server URL | Yes |
| `PUBLIC_ORIGIN` | Public URL of the app | No |
| `PORT` | Server port (default: 3000) | No |

### **API Endpoints**
The application provides RESTful API endpoints:
- `/api/auth/*` - User authentication (login, register, logout, verify)
- `/api/anime/*` - Anime streaming and metadata
- `/api/manga/*` - Manga reading and chapter data
- `/api/comics/*` - Comics reading and issue data
- `/api/downloads/*` - Download status and history
- `/api/torrents/*` - Torrent operations (add, status, poll progress)
- `/api/proxy/*` - Media proxy for streaming
- `/api/search/*` - Universal search across content types

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### **Development Guidelines**
- Follow TypeScript best practices
- Write clean, self-documenting code
- Add proper error handling
- Test your changes thoroughly
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## ⚠️ Disclaimer

This application is provided for educational and personal use only. Users are responsible for:
- Ensuring compliance with all applicable laws and regulations in their jurisdiction
- Respecting copyright and intellectual property rights
- Using content services (Real-Debrid, Jackett) in accordance with their terms of service
- Understanding that the developers are not responsible for how this software is used

**Note**: This project does not host, store, or distribute any copyrighted content. It merely provides interfaces to existing services and APIs.

## 🆘 Support & Troubleshooting

### **Common Issues**

**Can't login/register?**
- Ensure PostgreSQL is running and accessible
- Check database credentials in `.env`
- Verify JWT_SECRET is set

**Torrent search not working?**
- Confirm Jackett is running and accessible
- Verify JACKETT_API_KEY and JACKETT_URL in `.env`
- Check Jackett has indexers configured

**Downloads not starting?**
- Verify Real-Debrid API key is valid
- Check Real-Debrid account status and limits
- Ensure magnet links are valid

**Video won't play?**
- Try switching servers (HD-1, HD-2, HD-3)
- Check browser console for errors
- Verify HLS.js is loaded correctly

### **Getting Help**

If you encounter issues:
1. Check the [GitHub Issues](https://github.com/trazonm/BakaWorld-X/issues) page
2. Search for similar problems and solutions
3. Create a new issue with:
   - Detailed description of the problem
   - Steps to reproduce
   - Error messages or logs
   - Environment details (OS, browser, etc.)

## 🎯 Roadmap

- [x] **PWA support** with offline capabilities
- [x] **Dual theme system** (Dark Mode & Midnight Mode)
- [x] **Manga & Comics** reading support
- [x] **Real-time download tracking** via WebSocket
- [ ] **User preferences** and customization
- [ ] **Watchlist & reading list** management
- [ ] **Advanced filtering** and sorting options
- [ ] **Multi-language subtitle** support
- [ ] **Recommendation engine** based on viewing history
- [ ] **Social features** (reviews, ratings, comments)
- [ ] **Mobile app** development
- [ ] **Batch download** operations
- [ ] **Auto-download** for series tracking
- [ ] **Performance optimizations**

---

**Built with ❤️ using SvelteKit**
