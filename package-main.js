const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const keytar = require('keytar'); // ✅ keytar used here for secure token deletion
const fs = require('fs/promises');
const os = require('os');
const StreamZip = require('node-stream-zip');

let mainWindow;
let rememberMe = false; // ✅ Track remember-me state

app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');

app.on('ready', async () => {
	const rememberFlag = await keytar.getPassword('MangaBox-settings', 'rememberMe');
	rememberMe = rememberFlag === 'true';

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
	ipcMain.on('remember-me-state', async (_, value) => {
		rememberMe = value;
		if (value) {
			await keytar.setPassword('MangaBox-settings', 'rememberMe', 'true');
		} else {
			await keytar.deletePassword('MangaBox-settings', 'rememberMe');
		}
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

ipcMain.handle('download-and-store-book', async (_, { bookId, bookTitle, baseUrl, requestData }) => {
	try {
		const baseDir = path.join(app.getPath('userData'), 'offline-books');
		await fs.mkdir(baseDir, { recursive: true });

		const bookFolder = path.join(baseDir, bookId);
		await fs.mkdir(bookFolder, { recursive: true });

		/*
		const zipPath = path.join(bookFolder, `${bookId}.cbz`);

		// ✅ Download CBZ file with Bearer token
		console.log('🌐 Downloading CBZ for', bookId);
		let res = await fetch(`${baseUrl}/api/v1/books/${bookId}/file`, requestData);
		console.log('🌐 Fetch response status:', res.status);
		if (!res.ok) throw new Error(`Failed to download: ${res.status}`);

		const buffer = Buffer.from(await res.arrayBuffer());
		console.log('💾 Writing CBZ to disk...');
		await fs.writeFile(zipPath, buffer);

		// ✅ Extract CBZ
		const zip = new StreamZip.async({ file: zipPath });
		await zip.extract(null, bookFolder);
		await zip.close();

		// Optionally delete original CBZ to save space
		await fs.unlink(zipPath);
		*/

		console.log('🌐 Downloading book metadata for', bookId);
		res = await fetch(`${baseUrl}/api/v1/books/${bookId}`, requestData);
		console.log('🌐 Fetch response status:', res.status);
		if (!res.ok) throw new Error(`Failed to download: ${res.status}`);

		// ✅ Get JSON from Komga
		const bookMeta = await res.json();

		// ✅ Save the full metadata to the folder
		const mbookMetaPath = path.join(bookFolder, 'metadata-book.json');
		await fs.writeFile(mbookMetaPath, JSON.stringify(bookMeta, null, 2));

		console.log('💾 Book metadata saved to', mbookMetaPath);


		console.log('🌐 Downloading pages metadata for', bookId);
		res = await fetch(`${baseUrl}/api/v1/books/${bookId}/pages`, requestData);
		console.log('🌐 Fetch response status:', res.status);
		if (!res.ok) throw new Error(`Failed to download: ${res.status}`);

		// ✅ Get JSON from Komga
		const pagesMeta = await res.json();

		// ✅ Save the full metadata to the folder
		const pagesMetaPath = path.join(bookFolder, 'metadata-pages.json');
		await fs.writeFile(pagesMetaPath, JSON.stringify(pagesMeta, null, 2));

		console.log('💾 Book metadata saved to', pagesMetaPath);


		for (const page of pagesMeta) {
			const pageUrl = `${baseUrl}/api/v1/books/${bookId}/pages/${page.number}`;
			console.log(`⬇️ Downloading page ${page.number}...`);
			const res = await fetch(pageUrl, requestData);
			if (!res.ok) throw new Error(`Failed to fetch page ${page.number}: ${res.status}`);
			const buffer = Buffer.from(await res.arrayBuffer());
			await fs.writeFile(path.join(bookFolder, page.fileName), buffer);
		}

		console.log(`📕 Downloaded and stored book: ${bookTitle} (${bookId})`);
		return { ok: true, path: bookFolder };
	} catch (err) {
		console.error('❌ Download failed:', err);
		return { ok: false, error: err.message };
	}
});

