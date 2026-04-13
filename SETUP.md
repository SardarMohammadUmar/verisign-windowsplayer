# Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**

## Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   - Open `config.json`
   - Replace all Firebase configuration values with your actual Firebase project credentials
   - You can find these in Firebase Console → Project Settings → General → Your apps

3. **Configure CMS API**
   - Update `cmsApiBaseUrl` in `config.json` with your Laravel CMS base URL
   - Example: `"cmsApiBaseUrl": "https://your-cms.com/api"`

4. **Development Mode**
   ```bash
   # Terminal 1: Start Vite dev server
   npm run dev

   # Terminal 2: Start Electron
   npm run build:electron
   npm start
   ```

5. **Build for Production**
   ```bash
   npm run dist
   ```
   This will create a Windows installer in the `dist` folder.

## Configuration

### config.json Structure

```json
{
  "cmsApiBaseUrl": "https://your-cms.com/api",
  "firebaseConfig": {
    "apiKey": "YOUR_API_KEY",
    "authDomain": "YOUR_AUTH_DOMAIN",
    "databaseURL": "YOUR_DATABASE_URL",
    "projectId": "YOUR_PROJECT_ID",
    "storageBucket": "YOUR_STORAGE_BUCKET",
    "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
    "appId": "YOUR_APP_ID"
  },
  "heartbeatInterval": 30000,
  "mediaCachePath": "media-cache"
}
```

## How It Works

1. **First Launch**: Player generates a 6-digit screen code and saves it locally
2. **Firebase Setup**: Creates a screen entry in Firebase Realtime Database
3. **Pairing**: Shows pairing screen with code until CMS connects
4. **Connection**: When CMS sets `connected: true`, player fetches content
5. **Content Playback**: 
   - If `layoutSelected: true` → Multi-section layout
   - If `layoutSelected: false` → Fullscreen playlist
6. **Updates**: Listens to Firebase `lastUpdated` changes and refreshes content
7. **Heartbeat**: Updates `online: true` every 30 seconds

## Troubleshooting

### Firebase Connection Issues
- Verify Firebase configuration in `config.json`
- Check Firebase Realtime Database rules allow read/write
- Ensure database URL is correct

### CMS API Issues
- Verify API endpoint is accessible
- Check CORS settings on your Laravel API
- Ensure API returns correct JSON format

### Media Not Loading
- Check network connectivity
- Verify media URLs are correct
- Check browser console for errors
- Media cache is stored in: `{userData}/media-cache/`

### Auto-Start Not Working
- Run the app as administrator once to set up auto-launch
- Check Windows Task Scheduler for the auto-launch entry

## Development Notes

- Screen code is stored in: `{userData}/screen-code.json`
- Media cache: `{userData}/media-cache/`
- Logs appear in Electron DevTools console (press F12 in dev mode)

