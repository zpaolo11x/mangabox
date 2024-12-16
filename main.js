const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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
			preload: path.join(__dirname, 'preload.js'),
		},
	});

	mainWindow.loadFile('index.html'); // Replace 'index.html' with your main HTML file name
});

app.on('window-all-closed', () => {
	app.quit();
});

ipcMain.on('quit-app', () => {
	app.quit();
});

app.on('ready', createWindow);

