# Twitch ADs muter Extension (Base)

This is a minimal Chrome extension based on the Chrome Extensions "Hello World" tutorial structure.

## What it does
- Runs a content script on Twitch channel pages.
- Extracts a channel name from the URL.
- Tries to read viewer count and live time from the DOM.
- Logs a JSON payload to the page console.
- Mutes/unmutes during ads and can play audio notifications.
- Tracks mute statistics in `chrome.storage.local`.

## Notes
- The DOM selectors are best-effort guesses and may need updates.
- Use the extension popup to force a log on the active tab.
- Debug logging is controlled by `DEBUG_MODE` from `settings.defaults.json`/`settings.json`.

## Build
1. Install deps: `npm install`
2. Build: `npm run build`
3. Load the extension from the project root (manifest uses `dist/` outputs).

## Files
- `manifest.json`
- `src/index.ts`: entrypoint
- `src/content/`: content script modules
- `src/popup/`: `index.html`, `index.ts`, `index.css`
- `src/utils/logger.ts`
- `assets/icons/`
- `assets/audios/`
- `settings.defaults.json`, `settings.json`
