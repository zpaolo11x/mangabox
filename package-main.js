const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const fetch = global.fetch; // or just use fetch() directly

let mainWindow;
let server;
let komgaBaseUrl = null; // <-- Komga server URL set by renderer

app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');

app.on('ready', () => {
	const expressApp = express();
	const PORT = 3000;

	// Static files
	expressApp.use(express.static(path.join(__dirname)));

	// Proxy middleware for /api requests
	expressApp.use('/api', async (req, res) => {
		if (!komgaBaseUrl) {
			return res.status(500).send('Komga server URL not set');
		}

		// Construct full URL to Komga API
		const targetUrl = new URL(req.url, komgaBaseUrl).toString();

		// Prepare fetch options
		const headers = { ...req.headers };
		// Optionally delete/modify headers that might cause issues:
		delete headers['host'];
		delete headers['origin'];
		delete headers['referer'];

		let body = null;
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			body = req;
		}

		try {
			const response = await fetch(targetUrl, {
				method: req.method,
				headers,
				body,
				redirect: 'manual'
			});

			// Copy status
			res.status(response.status);

			// Copy headers (you might want to filter some headers)
			response.headers.forEach((value, key) => {
				// Exclude content-encoding to avoid double compression issues
				if (key.toLowerCase() === 'content-encoding') return;
				res.setHeader(key, value);
			});

			// Pipe response body
			//response.body.pipe(res);
			const buffer = await response.arrayBuffer();
			res.end(Buffer.from(buffer));

		} catch (error) {
			console.error('Proxy error:', error);
			res.status(500).send('Proxy error: ' + error.message);
		}
	});

	// Start server
	server = expressApp.listen(PORT, () => {
		console.log(`Express server running at http://localhost:${PORT}`);

		mainWindow = new BrowserWindow({
			width: 1200,
			height: 760,
			center: true,
			autoHideMenuBar: true,
			frame: false,
			titleBarStyle: 'hidden',
			trafficLightPosition: { x: -1000, y: 0 },
			titleBarOverlay: false,
			webPreferences: {
				preload: path.join(__dirname, 'package-preload.js'),
				nodeIntegration: false,
				contextIsolation: true,
				allowRunningInsecureContent: true
			},
		});

		mainWindow.loadURL(`http://localhost:${PORT}/index.html`);
		mainWindow.webContents.setVisualZoomLevelLimits(1, 5);

		// Existing IPC handlers
		ipcMain.on('window-minimize', () => mainWindow.minimize());
		ipcMain.on('window-maximize', () => {
			if (mainWindow.isMaximized()) mainWindow.unmaximize();
			else mainWindow.maximize();
		});
		ipcMain.on('window-close', () => mainWindow.close());

		mainWindow.on('enter-full-screen', () => mainWindow.webContents.send('fullscreen-changed', true));
		mainWindow.on('leave-full-screen', () => mainWindow.webContents.send('fullscreen-changed', false));
		mainWindow.on('maximize', () => mainWindow.webContents.send('window-maximized'));
		mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-unmaximized'));

		ipcMain.handle('get-app-version', () => app.getVersion());
	});

});

// IPC handler to receive Komga URL from renderer
ipcMain.handle('set-komga-url', (event, url) => {
	console.log('Setting Komga URL to:', url);
	komgaBaseUrl = url;
	return true;
});

app.on('window-all-closed', () => {
	if (server) {
		server.close();
	}
	app.quit();
});
