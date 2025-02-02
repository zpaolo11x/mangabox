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
		allowRunningInsecureContent: true
    },
  });

  mainWindow.loadFile('index.html'); // Replace 'index.html' with your main HTML file name
  mainWindow.webContents.setVisualZoomLevelLimits(1, 5);

});

app.on('window-all-closed', () => {
  app.quit();
});
