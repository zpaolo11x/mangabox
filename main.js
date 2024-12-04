const { app, BrowserWindow } = require('electron');

let mainWindow;

app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
	 autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html'); // Replace 'index.html' with your main HTML file name
});

app.on('window-all-closed', () => {
  app.quit();
});
