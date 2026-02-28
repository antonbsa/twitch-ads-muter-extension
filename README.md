# Twitch ADs muter

## Description

Chrome extension that auto-mutes Twitch ads, tracks mute stats, and provides quick popup toggles.

### Motivation

I'm a person who always have a twitch tab opened running a stream, regardless of what I'm doing. It's kind of my secondary screen, the "background content" playing. Since I'm (obviously) not subscribed to every streamer I watch in a day, I got several ads.

This is expected and I accept it, the problem is the frequency (usually same ads multiple times in the same day) and how loud it plays compared to stream volume. It takes my attention, I get angry and lost the flow of working, which basically breaks my desired "all day long twitch experience".

Ad blockers never worked fine for me (and I understand the importance of it for the streamer, mainly as I watch many non main stream streamers) and had different issues with the ad mute extensions available in the store. So I decided to build my own extension, with the dumbest approach as possible - but it works! I'm finely back on track while working, studying, and browsing with a stream running as background or secondary point of attention, without breaking my focus

## Features

- Mutes/unmutes during ads and can play audio notifications
- Tracks ad-mute stats (today, total, total muted time + average)
- Stores preferences (mute ads, audio notifications) in `chrome.storage.local`
- Popup UI auto-detects the active Twitch channel, shows stats, and provides toggles for ad muting and audio notifications

## How to use

**Installation**:
- This extension is not in the Chrome Web Store, so install it directly from this repository.
- Download the repo (or `git clone` it) and open a terminal in the project root.
- Install dependencies: `npm install`.
- Build the extension: `npm run build`.
- Open Chrome and go to `chrome://extensions`.
- Enable Developer mode (top right).
- Click "Load unpacked" and select the project root folder (the manifest references `dist/` outputs).

**Development**:
- Make changes in `src/`.
- Run watch mode to rebuild on changes: `npm run dev` (optional: `--debounce=ms`).
- If you are not using watch mode, run `npm run build` after changes.
- Reload the extension in `chrome://extensions` to pick up the latest build.
