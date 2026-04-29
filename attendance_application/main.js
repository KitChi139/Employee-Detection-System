const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
  });

  win.loadURL('http://localhost:3000'); // your React app
}

app.whenReady().then(createWindow);