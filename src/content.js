let settings = {};

async function loadSettings() {
  try {
    const defaultsUrl = chrome.runtime.getURL("settings.defaults.json");
    const defaultsResponse = await fetch(defaultsUrl);
    if (defaultsResponse.ok) {
      const defaults = await defaultsResponse.json();
      if (defaults && typeof defaults === "object") {
        settings = { ...settings, ...defaults };
      }
    }

    const localUrl = chrome.runtime.getURL("settings.json");
    const localResponse = await fetch(localUrl);
    if (localResponse.ok) {
      const local = await localResponse.json();
      if (local && typeof local === "object") {
        settings = { ...settings, ...local };
      }
    }
  } catch {
    // Local settings are optional and ignored if missing.
  }
}

loadSettings();

const SELECTORS = {
  // These selectors are best-effort guesses and may need updates.
  viewers: '[data-a-target="animated-channel-viewers-count"]',
  liveTime: 'span.live-time span'
};

function getChannelFromUrl() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (!path) return null;
  const [channel] = path.split("/");
  return channel || null;
}

function parseViewerCount(text) {
  if (!text) return null;
  const trimmed = text.replace(/\s+/g, "");
  const match = trimmed.match(/^([0-9,.]+)([KkMm])?$/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  if (Number.isNaN(value)) return null;
  const unit = match[2]?.toLowerCase();
  if (unit === "k") return Math.round(value * 1000);
  if (unit === "m") return Math.round(value * 1000000);
  return Math.round(value);
}

function extractLiveData() {
  const channel = getChannelFromUrl();
  const viewersEl = document.querySelector(SELECTORS.viewers);
  const liveTimeEl = document.querySelector(SELECTORS.liveTime);

  const viewersText = viewersEl?.textContent?.trim() || null;
  const liveTimeText = liveTimeEl?.textContent?.trim() || null;

  return {
    channel,
    viewersText,
    viewers: parseViewerCount(viewersText),
    liveTime: liveTimeText,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
}

function collectLiveData() {
  const data = extractLiveData();
  if (settings.DEBUG_MODE) console.log("[Twitch ads muter]", data);

  return data;
}

function waitForElements(timeoutMs = 10000) {
  return new Promise((resolve) => {
    const hasElements = () =>
      Boolean(
        document.querySelector(SELECTORS.viewers) &&
          document.querySelector(SELECTORS.liveTime)
      );

    if (hasElements()) {
      resolve();
      return;
    }

    const observer = new MutationObserver(() => {
      if (hasElements()) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, timeoutMs);
  });
}

function tryLogAfterLoad() {
  if (!window.location.hostname.endsWith("twitch.tv")) return;
  setTimeout(() => {
    collectLiveData();
  }, 1500);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "getData") {
    const wait = Boolean(message.wait);

    if (wait) {
      waitForElements().then(() => {
        const data = collectLiveData();
        sendResponse({ ok: true, data });
      });
      return true;
    }

    const data = collectLiveData();
    sendResponse({ ok: true, data });
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", tryLogAfterLoad, { once: true });
} else {
  tryLogAfterLoad();
}
