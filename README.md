# Twitch ADs muter Extension (Base)

This is a minimal Chrome extension based on the Chrome Extensions "Hello World" tutorial structure.

## What it does
- Runs a content script on Twitch channel pages.
- Extracts a channel name from the URL.
- Tries to read viewer count and live time from the DOM.
- Logs a JSON payload to the page console.

## Notes
- The DOM selectors are best-effort guesses and may need updates.
- Use the extension popup to force a log on the active tab.
