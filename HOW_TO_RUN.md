# How to Run the Digital Signage Player

## Development Mode

The app requires **TWO terminals** to run in development:

### Terminal 1: Start Vite Dev Server
```bash
npm run dev
```
This will start the Vite dev server (usually on port 5173 or 5174).

**Keep this terminal running!**

### Terminal 2: Start Electron App
```bash
npm start
```
This will:
1. Build the Electron main process
2. Launch the Electron window
3. Connect to the Vite dev server

The Electron window will:
- Show a normal window (not fullscreen) in development
- Have DevTools open automatically
- Allow you to close it normally
- Use **Ctrl+Shift+Q** to quit if needed

## How It Works (Android Player Flow)

1. **Player Starts (Host)**
   - Generates a unique 6-digit screen code
   - Creates a Firebase document with `connected: false`
   - Displays the pairing screen with the code
   - Listens in real-time for `connected` to become `true`

2. **CMS Connects (Client)**
   - User enters the screen code in CMS
   - CMS sets `connected: true` in Firebase

3. **After Connection**
   - Player detects `connected === true`
   - Immediately calls API: `GET /api/player/screen/{screen_code}`
   - Fetches layout/playlist data
   - Downloads and caches media in background
   - Starts playing content

4. **Real-Time Updates**
   - Player listens to Firebase `lastUpdated` timestamp
   - When `lastUpdated` changes → calls API again → refreshes content
   - Heartbeat: Updates `online: true` every 30 seconds

5. **Offline Behavior**
   - If internet disconnects, plays last cached media
   - Continues working with cached content

## Testing the Connection Flow

1. Start the app (both terminals)
2. Note the 6-digit code displayed
3. In your CMS, enter this code to connect
4. The app should automatically:
   - Detect `connected: true`
   - Fetch content from API
   - Start playing media

## Production Build

```bash
npm run dist
```

This creates a Windows installer with:
- Fullscreen kiosk mode
- Auto-start on boot
- No close/minimize buttons
- Auto-restart on crash

## Troubleshooting

### White Screen / Can't Close Window
- In development, the window should be closeable
- If stuck, use **Ctrl+Shift+Q** to quit
- Or close from Task Manager

### Dev Server Not Found
- Make sure `npm run dev` is running in Terminal 1
- Check what port Vite is using (usually 5173 or 5174)
- Restart Electron after starting dev server

### Screen Code Not Showing
- Check browser console for errors
- Make sure Firebase credentials are correct in `config.json`
- Check if screen was created in Firebase

### Connection Not Working
- Check Firebase console to see if `connected` is being set
- Check browser console for API errors
- Verify API endpoint URL in `config.json`
