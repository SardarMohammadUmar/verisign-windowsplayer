# Windows Digital Signage Player - Project Structure

## Complete File List

```
windows-digital-signage-player/
├── electron/                          # Electron Main Process
│   ├── main.ts                        # Main process entry point
│   ├── preload.ts                     # Preload script for IPC
│   └── tsconfig.json                  # TypeScript config for Electron
│
├── src/                               # React Renderer Process
│   ├── components/                    # React Components
│   │   ├── PairingScreen.tsx         # Pairing UI component
│   │   ├── PairingScreen.css         # Pairing screen styles
│   │   ├── LayoutPlayer.tsx           # Multi-section layout player
│   │   ├── LayoutPlayer.css           # Layout player styles
│   │   ├── PlaylistPlayer.tsx         # Fullscreen playlist player
│   │   └── PlaylistPlayer.css         # Playlist player styles
│   │
│   ├── services/                      # Business Logic Services
│   │   ├── firebase.ts                # Firebase Realtime Database integration
│   │   ├── api.ts                     # CMS API service
│   │   └── mediaCache.ts              # Media caching system
│   │
│   ├── types/                         # TypeScript Type Definitions
│   │   └── index.ts                   # All type definitions
│   │
│   ├── utils/                         # Utility Functions
│   │   └── screenCode.ts              # Screen code generation & persistence
│   │
│   ├── App.tsx                        # Main React component
│   ├── App.css                        # App styles
│   ├── main.tsx                       # React entry point
│   └── vite-env.d.ts                  # Vite type declarations
│
├── config.json                        # Configuration file (Firebase, CMS API)
├── package.json                       # Dependencies and scripts
├── tsconfig.json                      # TypeScript config for renderer
├── tsconfig.node.json                 # TypeScript config for Node
├── vite.config.ts                     # Vite build configuration
├── electron-builder.yml               # Electron Builder config
├── index.html                         # HTML entry point
├── .gitignore                         # Git ignore rules
├── README.md                          # Project documentation
├── SETUP.md                           # Setup instructions
└── PROJECT_STRUCTURE.md               # This file
```

## Key Features Implemented

✅ **Electron Main Process**
- Kiosk mode (fullscreen, no minimize/close)
- Auto-restart on crash
- Windows auto-launch on boot
- IPC handlers for file operations

✅ **Screen Code System**
- Generates 6-digit code on first launch
- Persists to local storage
- Retrieves existing code on restart

✅ **Firebase Integration**
- Creates screen object in Firebase
- Real-time listener for `connected` and `lastUpdated`
- Heartbeat system (updates `online` every 30s)

✅ **CMS API Integration**
- Fetches screen data from Laravel CMS
- Handles layouts and playlists
- Error logging system

✅ **Media Caching**
- Downloads media files locally
- Checks cache before downloading
- Supports offline playback

✅ **UI Components**
- Pairing screen with code display
- Multi-section layout renderer
- Fullscreen playlist player

✅ **Real-Time Updates**
- Listens to Firebase changes
- Automatically refreshes content

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure `config.json`:**
   - Add Firebase credentials
   - Set CMS API base URL

3. **Run in development:**
   ```bash
   npm run dev              # Terminal 1: Vite dev server
   npm run build:electron && npm start  # Terminal 2: Electron
   ```

4. **Build for production:**
   ```bash
   npm run dist
   ```

## Configuration

Edit `config.json` to set:
- Firebase Realtime Database credentials
- CMS API base URL
- Heartbeat interval (default: 30000ms)

## Project Status

✅ All core features implemented
✅ TypeScript configured
✅ React components built
✅ Firebase integration complete
✅ Media caching system ready
✅ Auto-launch configured
✅ Kiosk mode enabled

**Ready for development and testing!**

