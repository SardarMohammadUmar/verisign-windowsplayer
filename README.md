# Windows Digital Signage Player

An ElectronJS-based digital signage player for Windows that replicates Android player functionality.

## Features

- **6-Digit Screen Code Generation**: Generates and persists a unique screen code on first launch
- **Firebase Integration**: Real-time synchronization with Firebase Realtime Database
- **CMS API Integration**: Fetches layouts, playlists, and media from Laravel CMS
- **Multi-Section Layout Support**: Renders complex grid layouts with multiple sections
- **Playlist Playback**: Fullscreen playlist playback with interval support
- **Media Caching**: Downloads and caches media for offline playback
- **Auto-Start**: Automatically launches on Windows boot
- **Kiosk Mode**: Fullscreen kiosk mode with disabled minimize/close
- **Auto-Restart**: Automatically restarts on crash
- **Real-Time Updates**: Listens for Firebase changes and refreshes content
- **Heartbeat System**: Updates online status every 30 seconds

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   - Open `config.json`
   - Add your Firebase configuration:
     ```json
     {
       "firebaseConfig": {
         "apiKey": "YOUR_API_KEY",
         "authDomain": "YOUR_AUTH_DOMAIN",
         "databaseURL": "YOUR_DATABASE_URL",
         "projectId": "YOUR_PROJECT_ID",
         "storageBucket": "YOUR_STORAGE_BUCKET",
         "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
         "appId": "YOUR_APP_ID"
       }
     }
     ```

3. **Configure CMS API**
   - Update `cmsApiBaseUrl` in `config.json`:
     ```json
     {
       "cmsApiBaseUrl": "https://your-cms.com/api"
     }
     ```

## Development

```bash
# Run in development mode
npm run dev

# Build Electron app
npm run build:electron

# Start Electron
npm start
```

## Building for Production

```bash
# Build and package
npm run dist
```

This will create a Windows installer in the `dist` folder.

## Project Structure

```
├── electron/          # Electron main process
│   ├── main.ts       # Main process entry point
│   └── preload.ts    # Preload script
├── src/              # Renderer process (React)
│   ├── components/   # React components
│   ├── services/     # Services (Firebase, API, Media Cache)
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
├── config.json       # Configuration file
└── package.json      # Dependencies and scripts
```

## Firebase Database Structure

The player creates the following structure in Firebase:

```
screens/
  {screen_code}/
    connected: boolean
    hasPlaylist: boolean
    lastUpdated: timestamp
    location: string
    name: string
    online: boolean
    playlistIds: string
    remote_access_id: string
    screen_code: string
    status: string
```

## CMS API Endpoint

The player calls:
```
GET /api/player/screen/{screen_code}
```

Expected response format:
```json
{
  "layoutSelected": true,
  "screen": { ... },
  "layout": { ... },
  "playlists": [ ... ]
}
```

## Media Caching

Media files are cached locally in:
```
{userData}/media-cache/{media-id}.{extension}
```

The player checks for cached files before downloading, enabling offline playback.

## License

MIT

