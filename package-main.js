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
		console.error('Komga base URL not set');
		return res.status(500).send('Komga server URL not set');
	}

	const targetUrl = new URL(req.url, komgaBaseUrl).toString();
	console.log(`[Proxy] Forwarding ${req.method} ${req.url} -> ${targetUrl}`);

	try {
		const headers = { ...req.headers };
		delete headers['host'];     // Strip potentially problematic headers
		delete headers['origin'];
		delete headers['referer'];

		// Forward the request body only for non-GET/HEAD
		const fetchOptions = {
			method: req.method,
			headers,
			body: (req.method !== 'GET' && req.method !== 'HEAD') ? req : null,
			redirect: 'manual'
		};

		const response = await fetch(targetUrl, fetchOptions);

		// Forward status and headers
		res.status(response.status);
		response.headers.forEach((value, key) => {
			if (key.toLowerCase() === 'content-encoding') return; // avoid encoding issues
			res.setHeader(key, value);
		});

		// Forward body
		response.body.pipe(res);
	} catch (err) {
		console.error(`[Proxy Error] Failed to forward request to ${targetUrl}`, err);
		res.status(500).send('Proxy error: ' + err.message);
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
