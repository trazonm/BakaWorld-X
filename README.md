# 🎌 BakaWorld X

**A modern anime streaming and torrent management platform built with SvelteKit**

BakaWorld X is a full-stack web application that provides a seamless anime streaming experience with integrated torrent management, Real-Debrid integration, and a clean, modern UI. Built with performance and user experience in mind.

## ✨ Features

### 🎥 **Anime Streaming**
- **High-quality video playback** with multiple server options (HD-1, HD-2, HD-3)
- **HLS streaming support** with adaptive bitrate
- **Modern video player** powered by Plyr with custom controls
- **Episode navigation** with previous/next functionality
- **Server switching** for optimal streaming experience
- **Subbed and dubbed** content support

### 📱 **User Interface**
- **Responsive design** that works on all devices
- **Dark theme** optimized for media consumption
- **Modern UI components** using Flowbite Svelte
- **Keyboard shortcuts** for enhanced user experience
- **Loading states** and error handling with helpful messages

### 🔍 **Search & Discovery**
- **Anime search** with real-time results
- **Advanced filtering** by category and server
- **Anime details** with episode listings
- **Smart navigation** between episodes

### 🌊 **Torrent Management**
- **Torrent search** integration via Jackett
- **Real-Debrid integration** for premium streaming
- **Download management** with progress tracking
- **Magnet link handling** and torrent info display
- **Batch operations** for managing multiple downloads

### 🔐 **Authentication & Security**
- **JWT-based authentication** with secure session management
- **User registration and login** system
- **Password hashing** with bcrypt
- **Protected routes** and API endpoints

### 🛠️ **Technical Features**
- **Server-side rendering** for optimal SEO and performance
- **API proxy** for secure external service integration
- **PostgreSQL database** integration
- **TypeScript** for type safety
- **Modern build system** with Vite

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **pnpm** (recommended) or npm
- **PostgreSQL** database
- **Real-Debrid account** (for premium features)
- **Jackett server** (for torrent search)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bakaworld-x.git
   cd bakaworld-x
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=bakaworld
   DB_USER=your_username
   DB_PASSWORD=your_password

   # JWT Secret
   JWT_SECRET=your_super_secret_jwt_key

   # Real-Debrid API
   REAL_DEBRID_AUTH=your_realdebrid_api_key

   # Jackett API
   JACKETT_API_KEY=your_jackett_api_key
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database and run migrations
   # (Database setup instructions depend on your migration system)
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

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
│   ├── components/         # UI Components
│   ├── composables/        # Reusable logic hooks
│   ├── config/            # App configuration
│   ├── server/            # Server-side utilities
│   ├── services/          # API service layer
│   ├── stores/            # Svelte stores for state
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
├── routes/                 # SvelteKit routes
│   ├── api/               # API endpoints
│   │   ├── auth/         # Authentication
│   │   ├── anime/        # Anime streaming
│   │   ├── downloads/    # Download management
│   │   ├── proxy/        # Media proxy
│   │   ├── search/       # Search functionality
│   │   └── torrents/     # Torrent operations
│   ├── anime/            # Anime pages
│   ├── downloads/        # Downloads page
│   └── home/             # Home page
└── static/               # Static assets
```

## 🛠️ Tech Stack

### **Frontend**
- **SvelteKit** - Full-stack framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Flowbite Svelte** - UI component library
- **Plyr** - Modern video player
- **HLS.js** - HTTP Live Streaming

### **Backend**
- **SvelteKit API Routes** - Server-side logic
- **PostgreSQL** - Primary database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### **External Integrations**
- **Real-Debrid API** - Premium link generation
- **Jackett** - Torrent indexer aggregation
- **Anime APIs** - Content metadata

### **Development Tools**
- **Vite** - Build tool and dev server
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **svelte-check** - TypeScript checking

## 🎮 Usage

### **Watching Anime**
1. Browse or search for anime
2. Select an episode from the list
3. Choose your preferred server (HD-2 recommended)
4. Select subbed or dubbed version
5. Enjoy streaming with keyboard controls:
   - `Space` - Play/Pause
   - `F` - Fullscreen
   - `←/→` - Seek ±10s
   - `↑/↓` - Volume ±5%

### **Managing Downloads**
1. Navigate to the Downloads page
2. Search for torrents using the integrated search
3. Add torrents to Real-Debrid
4. Monitor download progress
5. Access completed downloads

### **Server Options**
- **HD-1** - Standard quality server
- **HD-2** - Recommended high-quality server
- **HD-3** - Alternative server option

## 🔧 Configuration

### **Environment Variables**
All sensitive configuration is handled through environment variables. See the installation section for required variables.

### **API Endpoints**
The application provides several API endpoints for different functionalities:
- `/api/auth/*` - Authentication endpoints
- `/api/anime/*` - Anime streaming and metadata
- `/api/downloads/*` - Download management
- `/api/torrents/*` - Torrent operations
- `/api/proxy/*` - Media proxy services
- `/api/search/*` - Search functionality

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

This application is for educational purposes only. Users are responsible for ensuring they comply with all applicable laws and regulations regarding content streaming and downloading in their jurisdiction.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Join our community discussions

## 🎯 Roadmap

- [ ] **Mobile app** development
- [ ] **Offline viewing** support
- [ ] **Social features** (watchlists, reviews)
- [ ] **Multi-language** subtitle support
- [ ] **Advanced search** filters
- [ ] **Recommendation engine**
- [ ] **Performance optimizations**

---

**Built with ❤️ using SvelteKit**
