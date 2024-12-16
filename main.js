const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		autoHideMenuBar: true,
		webPreferences: {
			preload: require('path').join(__dirname, 'preload.js'),
			contextIsolation: true, // REQUIRED for contextBridge
			enableRemoteModule: false, // Best practice for security
			nodeIntegration: false, // Ensures better security
			sandbox: true, // Optional: Runs preload in a secure sandbox
		},
	});

	mainWindow.loadFile('index.html'); // Replace 'index.html' with your main HTML file name
};

app.on('window-all-closed', () => {
	app.quit();
});

ipcMain.on('quit-app', () => {
	app.quit();
});

app.on('ready', createWindow);
