const statusEl = document.getElementById("status");
const liveTimeEl = document.getElementById("liveTime");
const viewersCountEl = document.getElementById("viewersCount");

function setStatus(message) {
  statusEl.textContent = message;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function renderValues(data) {
  liveTimeEl.textContent = data?.liveTime || "--";
  viewersCountEl.textContent = data?.viewersText || "--";
}

async function fetchCurrentChannel() {
  setStatus("Checking active tab...");

  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    setStatus("No active tab found.");
    renderValues(null);
    return;
  }

  chrome.tabs.sendMessage(
    tab.id,
    { type: "getData", wait: true },
    (response) => {
      if (chrome.runtime.lastError) {
        setStatus("Content script not available on this page.");
        renderValues(null);
        return;
      }

      if (!response || response.ok !== true) {
        setStatus("Could not read Twitch data.");
        renderValues(null);
        return;
      }

      renderValues(response.data);
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      setStatus(`Loaded at ${timestamp}`);
    }
  );
}

fetchCurrentChannel();
