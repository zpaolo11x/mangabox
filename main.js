const { app, BrowserWindow } = require('electron');

let mainWindow;

app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');

app.on('ready', () => {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		autoHideMenuBar: true,
		frame: false,         // Disable the default window frame
		titleBarStyle: 'hidden', // Optional: macOS specific
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: true,
			contextIsolation: false,
			allowRunningInsecureContent: true
		},
	});

	mainWindow.loadFile('index.html'); // Replace 'index.html' with your main HTML file name
	mainWindow.webContents.setVisualZoomLevelLimits(1, 5);

	ipcMain.on('window-minimize', () => {
		mainWindow.minimize();
	});

	ipcMain.on('window-maximize', () => {
		if (mainWindow.isMaximized()) {
			mainWindow.unmaximize();
		} else {
			mainWindow.maximize();
		}
	});

	ipcMain.on('window-close', () => {
		mainWindow.close();
	});

	// Check URL changes and enable zoom conditionally
	/* 
	 mainWindow.webContents.on('did-navigate', (_, url) => {
	  if (url.includes('bookread')) {
		 // ✅ Enable pinch-to-zoom only when URL contains "reader.html"
		 mainWindow.webContents.setVisualZoomLevelLimits(1, 5);
	  } else {
		 // ❌ Disable pinch-to-zoom for other pages
		 mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
	  }
	});
	*/
});

app.on('window-all-closed', () => {
	app.quit();
});
