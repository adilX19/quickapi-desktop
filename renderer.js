// --- NEW: Global state and element references ---
let activeTabId = null;
let tabTemplate = null;
let tabBarContainer = null;
let tabContentContainer = null;
let addTabBtn = null;

// --- Main initialization ---
document.addEventListener("DOMContentLoaded", () => {
  // Get main template and container elements
  tabTemplate = document.getElementById("tab-template");
  tabBarContainer = document.getElementById("tab-bar-container");
  tabContentContainer = document.getElementById("tab-content-container");
  addTabBtn = document.getElementById("add-tab-btn");

  if (!tabTemplate || !tabBarContainer || !tabContentContainer || !addTabBtn) {
    console.error("Fatal Error: Core UI elements are missing!");
    return;
  }

  // Add listener for the "New Tab" button
  addTabBtn.addEventListener("click", () => createNewTab());

  // Create the first, default tab on load
  createNewTab();
});

/**
 * --- NEW: Creates a new tab button and content panel ---
 * @param {object | null} tabData - Optional data to restore (for duplicating)
 */
function createNewTab(tabData = null) {
  const tabId = `tab-${Date.now()}`;

  // --- 1. Create the Tab Content Panel ---
  const templateClone = tabTemplate.content.cloneNode(true);
  const tabContentEl = templateClone.querySelector(".tab-content-panel");

  if (!tabContentEl) {
    console.error("Template is missing .tab-content-panel");
    return;
  }

  tabContentEl.id = tabId;
  tabContentEl.classList.add("hidden"); // Hide by default
  tabContentContainer.appendChild(tabContentEl);

  // --- 2. Create the Tab Button ---
  const tabButtonEl = document.createElement("button");
  tabButtonEl.className =
    "tab-button flex items-center px-4 py-2 text-sm font-medium rounded-t-md border-b-2";
  tabButtonEl.dataset.tabId = tabId;
  tabButtonEl.innerHTML = `
        <span class="tab-title" contenteditable="true">Untitled</span>
        <span class="tab-duplicate-btn" title="Duplicate Tab">❐</span>
        <span class="tab-close-btn" title="Close Tab">&times;</span>
    `;

  // Insert new tab button *before* the "+" button
  tabBarContainer.insertBefore(tabButtonEl, addTabBtn);

  // --- 3. Add Listeners for the Tab Button ---

  // Click on tab (but not on buttons) to activate
  tabButtonEl.addEventListener("click", (e) => {
    if (e.target === tabButtonEl || e.target.classList.contains("tab-title")) {
      activateTab(tabId);
    }
  });

  // Close button
  tabButtonEl.querySelector(".tab-close-btn").addEventListener("click", (e) => {
    e.stopPropagation(); // Stop click from bubbling to the tab button
    closeTab(tabId);
  });

  // Duplicate button
  tabButtonEl
    .querySelector(".tab-duplicate-btn")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      duplicateTab(tabId);
    });

  // Allow renaming, update title on URL change
  const tabTitleEl = tabButtonEl.querySelector(".tab-title");
  tabTitleEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Stop newline
      tabTitleEl.blur(); // "Save" the name
    }
  });

  // --- 4. Initialize and Activate ---

  // If we are duplicating, restore the state
  if (tabData) {
    restoreStateToTab(tabContentEl, tabData);
    // Set the title
    const url = tabData.url.split("?")[0].split("/").pop() || "Untitled";
    tabTitleEl.textContent = url.substring(0, 20);
  } else {
    // Create one default header row for new tabs
    const headersList = tabContentEl.querySelector(".headers-list");
    if (headersList) {
      headersList.appendChild(
        createHeaderRowElement("Content-Type", "application/json")
      );
    }
  }

  // Initialize all JavaScript logic for this new tab
  initTabLogic(tabContentEl, tabId, tabButtonEl);

  // Make the new tab active
  activateTab(tabId);
}

/**
 * --- NEW: Activates a given tab ---
 * @param {string} tabId - The ID of the tab to activate
 */
function activateTab(tabId) {
  if (activeTabId === tabId) return; // Already active

  activeTabId = tabId;

  // Deactivate all tabs
  tabBarContainer.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.remove("active");
  });
  tabContentContainer
    .querySelectorAll(".tab-content-panel")
    .forEach((panel) => {
      panel.classList.add("hidden");
    });

  // Activate the correct one
  const tabButtonEl = tabBarContainer.querySelector(`[data-tab-id="${tabId}"]`);
  const tabContentEl = document.getElementById(tabId);

  if (tabButtonEl && tabContentEl) {
    tabButtonEl.classList.add("active");
    tabContentEl.classList.remove("hidden");
  } else {
    // Tab not found, maybe it was closed
    // Try to activate the first available tab
    const firstTabBtn = tabBarContainer.querySelector(".tab-button");
    if (firstTabBtn) {
      activateTab(firstTabBtn.dataset.tabId);
    } else {
      // No tabs left, create a new one
      createNewTab();
    }
  }
}

/**
 * --- NEW: Closes a given tab ---
 * @param {string} tabId - The ID of the tab to close
 */
function closeTab(tabId) {
  const tabButtonEl = tabBarContainer.querySelector(`[data-tab-id="${tabId}"]`);
  const tabContentEl = document.getElementById(tabId);

  if (tabButtonEl) tabButtonEl.remove();
  if (tabContentEl) tabContentEl.remove();

  // If we closed the active tab, activate another one
  if (activeTabId === tabId) {
    activeTabId = null; // Clear active tab
    const firstTabBtn = tabBarContainer.querySelector(".tab-button");
    if (firstTabBtn) {
      activateTab(firstTabBtn.dataset.tabId);
    } else {
      // No tabs left, create a new one
      createNewTab();
    }
  }
}

/**
 * --- NEW: Duplicates a given tab ---
 * @param {string} tabId - The ID of the tab to duplicate
 */
function duplicateTab(tabId) {
  const tabContentEl = document.getElementById(tabId);
  if (!tabContentEl) return;

  const tabData = getStateFromTab(tabContentEl);
  createNewTab(tabData);
}

/**
 * --- NEW: Gathers all data from a tab panel ---
 * @param {HTMLElement} tabContentEl - The tab's content panel
 * @returns {object} An object with all the tab's data
 */
function getStateFromTab(tabContentEl) {
  const headers = [];
  tabContentEl.querySelectorAll(".headers-list .header-row").forEach((row) => {
    const key = row.querySelector(".header-key").value;
    const value = row.querySelector(".header-value").value;
    if (key) {
      headers.push({ key, value });
    }
  });

  return {
    method: tabContentEl.querySelector(".request-method").value,
    url: tabContentEl.querySelector(".request-url").value,
    body: tabContentEl.querySelector(".request-body").value,
    headers: headers,
  };
}

/**
 * --- NEW: Applies saved data to a new tab panel ---
 * @param {HTMLElement} tabContentEl - The new tab's content panel
 * @param {object} tabData - The data object from getStateFromTab
 */
function restoreStateToTab(tabContentEl, tabData) {
  tabContentEl.querySelector(".request-method").value = tabData.method || "GET";
  tabContentEl.querySelector(".request-url").value = tabData.url || "";
  tabContentEl.querySelector(".request-body").value = tabData.body || "";

  const headersList = tabContentEl.querySelector(".headers-list");
  headersList.innerHTML = ""; // Clear default headers

  if (tabData.headers && tabData.headers.length > 0) {
    tabData.headers.forEach((header) => {
      headersList.appendChild(createHeaderRowElement(header.key, header.value));
    });
  } else {
    // If no headers, add a default empty one
    headersList.appendChild(createHeaderRowElement());
  }
}

/**
 * --- NEW: Attaches all JS logic to a *specific* tab ---
 * @param {HTMLElement} tabContentEl - The content panel for this tab
 * @param {string} tabId - The unique ID for this tab
 * @param {HTMLElement} tabButtonEl - The button for this tab
 */
function initTabLogic(tabContentEl, tabId, tabButtonEl) {
  // --- Get all elements *scoped* to this tab ---
  // Note: We use querySelector, not getElementById!
  const requestMethod = tabContentEl.querySelector(".request-method");
  const requestUrl = tabContentEl.querySelector(".request-url");
  const sendButton = tabContentEl.querySelector(".send-button");
  const sendText = tabContentEl.querySelector(".send-text");
  const sendLoader = tabContentEl.querySelector(".send-loader");
  const headersList = tabContentEl.querySelector(".headers-list");
  const addHeaderBtn = tabContentEl.querySelector(".add-header-btn");
  const requestBody = tabContentEl.querySelector(".request-body");
  const responseStatus = tabContentEl.querySelector(".response-status");
  const responseTime = tabContentEl.querySelector(".response-time");
  const responseSize = tabContentEl.querySelector(".response-size");
  const responseBody = tabContentEl.querySelector(".response-body");
  const responseHeaders = tabContentEl.querySelector(".response-headers");
  const reqTabButtons = tabContentEl.querySelectorAll(".req-tab-btn");
  const reqTabContents = tabContentEl.querySelectorAll(".req-tab-content");
  const resTabButtons = tabContentEl.querySelectorAll(".res-tab-btn");
  const resTabContents = tabContentEl.querySelectorAll(".res-tab-content");
  const tabTitleEl = tabButtonEl.querySelector(".tab-title");

  // --- Tab Switching Logic (scoped) ---
  function setupTabs(tabButtons, tabContents, activeClass, inactiveClass) {
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Deactivate all
        tabButtons.forEach((btn) => {
          btn.classList.remove(activeClass.bg, activeClass.text);
          btn.classList.add(inactiveClass.bg, inactiveClass.text);
        });
        tabContents.forEach((content) => {
          content.classList.add("hidden");
        });

        // Activate clicked
        button.classList.add(activeClass.bg, activeClass.text);
        button.classList.remove(inactiveClass.bg, inactiveClass.text);
        const tabName = button.getAttribute("data-tab");
        // Find the content *within this tab panel*
        const contentEl = tabContentEl.querySelector(`.tab-content-${tabName}`);
        if (contentEl) {
          contentEl.classList.remove("hidden");
        }
      });
    });
  }

  if (reqTabButtons.length > 0) {
    setupTabs(
      reqTabButtons,
      reqTabContents,
      { bg: "bg-gray-800", text: "text-blue-400" },
      { bg: "bg-gray-900", text: "text-gray-400" }
    );
  }

  if (resTabButtons.length > 0) {
    setupTabs(
      resTabButtons,
      resTabContents,
      { bg: "bg-gray-800", text: "text-blue-400" },
      { bg: "bg-gray-900", text: "text-gray-400" }
    );
  }

  // --- Dynamic Header Row Logic (scoped) ---
  // (This function is now a factory, it *returns* the element)
  // createHeaderRow is now createHeaderRowElement, to avoid name conflicts
  if (addHeaderBtn) {
    addHeaderBtn.addEventListener("click", () => {
      if (headersList) {
        headersList.appendChild(createHeaderRowElement());
      }
    });
  }

  // Update tab title as user types URL
  if (requestUrl && tabTitleEl) {
    requestUrl.addEventListener("keyup", () => {
      try {
        // Try to parse as URL to get hostname
        const url = new URL(requestUrl.value);
        tabTitleEl.textContent = url.hostname.replace("www.", "") || "Untitled";
      } catch (e) {
        // If invalid URL, just show the start of the string
        tabTitleEl.textContent =
          requestUrl.value.substring(0, 20) || "Untitled";
      }
    });
  }

  // --- Send Request Logic (scoped) ---
  if (sendButton) {
    sendButton.addEventListener("click", async () => {
      if (!requestUrl) return;
      const url = requestUrl.value;
      const method = requestMethod ? requestMethod.value : "GET";

      if (!url) {
        console.error("Please enter a request URL.");
        // You could show a custom in-app modal here
        return;
      }

      // Show loader, disable button
      setLoading(true);
      clearResponse();

      const startTime = Date.now();
      const headers = new Headers();

      // Find headers *within this tab*
      tabContentEl
        .querySelectorAll(".headers-list .header-row")
        .forEach((row) => {
          const keyInput = row.querySelector(".header-key");
          const valueInput = row.querySelector(".header-value");
          if (keyInput && valueInput) {
            const key = keyInput.value;
            const value = valueInput.value;
            if (key) {
              headers.append(key, value);
            }
          }
        });

      const requestOptions = {
        method: method,
        headers: headers,
      };

      // Add body if method is not GET or HEAD
      if (
        method !== "GET" &&
        method !== "HEAD" &&
        requestBody &&
        requestBody.value
      ) {
        requestOptions.body = requestBody.value;
      }

      try {
        // Electron's fetch is not bound by CORS!
        const response = await fetch(url, requestOptions);
        const endTime = Date.now();

        // Process response
        const rawBody = await response.text();
        const size = new Blob([rawBody]).size;

        // Populate status
        updateStatus(response.status, response.statusText, response.ok);
        if (responseTime)
          responseTime.textContent = `${endTime - startTime} ms`;
        if (responseSize) responseSize.textContent = `${formatBytes(size)}`;

        // Populate response headers
        let headersText = "";
        response.headers.forEach((value, key) => {
          headersText += `${key}: ${value}\n`;
        });
        if (responseHeaders) responseHeaders.textContent = headersText;

        // Populate response body (try to format JSON)
        try {
          const json = JSON.parse(rawBody);
          if (responseBody)
            responseBody.textContent = JSON.stringify(json, null, 2);
        } catch (e) {
          // Not JSON, just show raw text
          if (responseBody) responseBody.textContent = rawBody;
        }
      } catch (error) {
        // Handle network errors
        updateStatus("Error", error.message, false);
        if (responseBody)
          responseBody.textContent = `Request Failed:\n\Small (e.g., connection refused, DNS error)\n${error}`;
        if (responseTime) responseTime.textContent = "0 ms";
        if (responseSize) responseSize.textContent = "0 B";
      } finally {
        setLoading(false);
      }
    });
  }

  // --- Utility Functions (now scoped) ---
  // These functions use the elements found *at the start* of initTabLogic

  function setLoading(isLoading) {
    if (!sendText || !sendLoader || !sendButton) return;
    if (isLoading) {
      sendText.classList.add("hidden");
      sendLoader.classList.remove("hidden");
      sendButton.disabled = true;
      sendButton.classList.add("opacity-75", "cursor-not-allowed");
    } else {
      sendText.classList.remove("hidden");
      sendLoader.classList.add("hidden");
      sendButton.disabled = false;
      sendButton.classList.remove("opacity-75", "cursor-not-allowed");
    }
  }

  function clearResponse() {
    if (responseStatus) {
      responseStatus.textContent = "";
      responseStatus.classList.remove(
        "text-green-400",
        "text-red-400",
        "text-yellow-400"
      );
    }
    if (responseTime) responseTime.textContent = "";
    if (responseSize) responseSize.textContent = "";
    if (responseBody) responseBody.textContent = "Waiting for request...";
    if (responseHeaders) responseHeaders.textContent = "";
  }

  function updateStatus(code, text, ok) {
    if (!responseStatus) return;
    responseStatus.textContent = `${code} ${text}`;
    responseStatus.classList.remove(
      "text-green-400",
      "text-red-400",
      "text-yellow-400"
    );
    if (code === "Error") {
      responseStatus.classList.add("text-red-400");
    } else if (ok) {
      responseStatus.classList.add("text-green-400");
    } else {
      responseStatus.classList.add("text-yellow-400");
    }
  }

  // --- Set initial state for this tab ---
  clearResponse();
}

// --- Global Utility Functions (don't depend on a tab) ---

/**
 * --- MODIFIED: Now returns an element, doesn't append it ---
 * @param {string} key
 * @param {string} value
 * @returns {HTMLElement} The new header row element
 */
function createHeaderRowElement(key = "", value = "") {
  const row = document.createElement("div");
  // NEW: Added .header-row class for easier selection
  row.className = "header-row flex space-x-2 mb-2";
  row.innerHTML = `
        <input type="text" class="header-key flex-1 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Header Key" value="${escapeHTML(
          key
        )}">
        <input type="text" class="header-value flex-1 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Header Value" value="${escapeHTML(
          value
        )}">
        <button class="remove-header-btn text-gray-500 hover:text-red-400 px-1 rounded-md">&times;</button>
    `;

  row.querySelector(".remove-header-btn").addEventListener("click", () => {
    row.remove();
  });

  return row;
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function escapeHTML(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
