const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const keytar = require('keytar'); // ✅ keytar used here for secure token deletion

let mainWindow;
let rememberMe = false; // ✅ Track remember-me state

app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');

app.on('ready', () => {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 760,
		center: true,
		autoHideMenuBar: true,
		frame: false,         // Disable the default window frame
		titleBarStyle: 'hidden', // Optional: macOS specific
		trafficLightPosition: { x: -1000, y: 0 }, // ✅ hide traffic lights (move them offscreen)
		titleBarOverlay: false,

		webPreferences: {
			preload: path.join(__dirname, 'package-preload.js'),
			nodeIntegration: false,
			contextIsolation: true,
			allowRunningInsecureContent: true,
			sandbox: false // ⬅️ this is the critical fix
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

	mainWindow.on('enter-full-screen', () => {
		mainWindow.webContents.send('fullscreen-changed', true);
	});

	mainWindow.on('leave-full-screen', () => {
		mainWindow.webContents.send('fullscreen-changed', false);
	});


	mainWindow.on('maximize', () => {
		mainWindow.webContents.send('window-maximized');
	});

	mainWindow.on('unmaximize', () => {
		mainWindow.webContents.send('window-unmaximized');
	});

	ipcMain.handle('get-app-version', () => {
		return app.getVersion(); // This uses the version from package.json
	});

	// ✅ Receive rememberMe status from renderer
	ipcMain.on('remember-me-state', (_, value) => {
		rememberMe = value;
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

// ✅ Secure token cleanup if rememberMe is false
app.on('before-quit', async () => {
	if (!rememberMe) {
		try {
			await keytar.deletePassword('MangaBox', 'auth');
			console.log("🔒 Token deleted on app quit (rememberMe was false).");
		} catch (err) {
			console.error("⚠️ Failed to delete token:", err);
		}
	}
});

app.on('window-all-closed', () => {
	app.quit();
});
