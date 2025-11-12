// main.js - This script creates the desktop window.

const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // We don't need preload, but it's good practice.
      // nodeIntegration: true, // Be cautious with this
      // contextIsolation: false, // Be cautious with this
      // For simplicity, we'll let the renderer handle its own logic
      // without deep Node integration.
    },
    icon: path.join(__dirname, "icon.png"), // (Optional: you can add an icon.png)
  });

  mainWindow.loadFile("index.html");
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
