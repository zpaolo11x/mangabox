const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const keytar = require('keytar'); // keytar used here for secure token deletion
const fs = require('fs/promises');
const os = require('os');

let mainWindow;
let rememberMe = false; // Track remember-me state

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
		trafficLightPosition: { x: -1000, y: 0 }, // hide traffic lights (move them offscreen)
		titleBarOverlay: false,

		webPreferences: {
			preload: path.join(__dirname, 'package-preload.js'),
			nodeIntegration: false,
			contextIsolation: true,
			allowRunningInsecureContent: true,
			sandbox: false // this is the critical fix
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

	// Receive rememberMe status from renderer
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
		 // Enable pinch-to-zoom only when URL contains "reader.html"
		 mainWindow.webContents.setVisualZoomLevelLimits(1, 5);
	  } else {
		 // Disable pinch-to-zoom for other pages
		 mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
	  }
	});
	*/
});

// Secure token cleanup if rememberMe is false
app.on('before-quit', async () => {
	if (!rememberMe) {
		try {
			await keytar.deletePassword('MangaBox', 'auth');
			console.log("Token deleted on app quit (rememberMe was false).");
		} catch (err) {
			console.error("Failed to delete token:", err);
		}
	}
});

app.on('window-all-closed', () => {
	app.quit();
});

// OFFLINE BOOK FUNCTIONS

ipcMain.handle('get-offline-book-data', async (_, bookId) => {
	try {
		const bookPath = path.join(app.getPath('userData'), 'offline-books', bookId);

		const bookMetadata = JSON.parse(await fs.readFile(path.join(bookPath, 'metadata-book.json'), 'utf-8'));
		const pagesMetadata = JSON.parse(await fs.readFile(path.join(bookPath, 'metadata-pages.json'), 'utf-8'));
		const seriesMetadata = JSON.parse(await fs.readFile(path.join(bookPath, 'metadata-series.json'), 'utf-8'));

		return { bookMetadata, pagesMetadata, seriesMetadata, bookPath };
	} catch (err) {
		console.error('❌ Failed to read offline book data:', err);
		throw err;
	}
});

ipcMain.handle('delete-offline-book-data', async (_, bookId) => {
	try {
		const bookPath = path.join(app.getPath('userData'), 'offline-books', bookId);

		try {
			await fs.access(bookPath);
		} catch {
			return { success: false, message: 'Book folder does not exist' };
		}

		// Recursively delete the folder and its contents
		await fs.rm(bookPath, { recursive: true, force: true });

		return { success: true };
	} catch (error) {
		console.error('Error deleting offline book data:', error);
		return { success: false, message: error.message };
	}
});

ipcMain.handle('read-file', async (_, filePath) => {
	try {
		const data = await fs.readFile(filePath, 'utf-8');
		return data;
	} catch (err) {
		console.error('Failed to read file:', filePath, err);
		throw err;
	}
});

ipcMain.handle('download-and-store-book', async (_, { bookId, bookTitle, baseUrl, requestData }) => {
	const win = BrowserWindow.getFocusedWindow(); // or keep a ref to your main window

	const baseDir = path.join(app.getPath('userData'), 'offline-books');
	await fs.mkdir(baseDir, { recursive: true });

	const bookFolder = path.join(baseDir, bookId);
	await fs.mkdir(bookFolder, { recursive: true });
	await fs.mkdir(path.join(bookFolder, 'pages'), { recursive: true });
	await fs.mkdir(path.join(bookFolder, 'thumbs'), { recursive: true });

	const mimeToExt = {
		'image/jpeg': '.jpg',
		'image/png': '.png',
		'image/webp': '.webp',
		'image/gif': '.gif',
	};

	let completed = 0;

	try {

		console.log('Downloading book metadata for', bookId);
		res = await fetch(`${baseUrl}/api/v1/books/${bookId}`, requestData);
		console.log('Fetch response status:', res.status);
		if (!res.ok) throw new Error(`Failed to download: ${res.status}`);
		// Get JSON from server
		const bookMeta = await res.json();
		// Save the full metadata to the folder
		const bookMetaPath = path.join(bookFolder, 'metadata-book.json');
		await fs.writeFile(bookMetaPath, JSON.stringify(bookMeta, null, 2));
		console.log('Book metadata saved to', bookMetaPath);


		console.log('Downloading series metadata for', bookId);
		res = await fetch(`${baseUrl}/api/v1/series/${bookMeta.seriesId}`, requestData);
		console.log('Fetch response status:', res.status);
		if (!res.ok) throw new Error(`Failed to download: ${res.status}`);
		// Get JSON from server
		const seriesMeta = await res.json();
		// Save the full metadata to the folder
		const seriesMetaPath = path.join(bookFolder, 'metadata-series.json');
		await fs.writeFile(seriesMetaPath, JSON.stringify(seriesMeta, null, 2));
		console.log('Series metadata saved to', seriesMetaPath);


		console.log('Downloading pages metadata for', bookId);
		res = await fetch(`${baseUrl}/api/v1/books/${bookId}/pages`, requestData);
		console.log('Fetch response status:', res.status);
		if (!res.ok) throw new Error(`Failed to download: ${res.status}`);
		// Get JSON from server
		const pagesMeta = await res.json();
		// Save the full metadata to the folder
		const pagesMetaPath = path.join(bookFolder, 'metadata-pages.json');
		await fs.writeFile(pagesMetaPath, JSON.stringify(pagesMeta, null, 2));
		console.log('Book metadata saved to', pagesMetaPath);

		const thumbUrl = `${baseUrl}/api/v1/books/${bookId}/thumbnail`;
		console.log(`Downloading book thumbnail`);
		res = await fetch(thumbUrl, requestData);
		if (!res.ok) throw new Error(`Failed to fetch thumbnail: ${res.status}`);
		const buffer = Buffer.from(await res.arrayBuffer());
		await fs.writeFile(path.join(bookFolder, 'thumbnail.jpg'), buffer);


		for (const page of pagesMeta) {
			const pageFile = path.join(bookFolder, 'pages', page.number + mimeToExt[page.mediaType]);
			const thumbFile = path.join(bookFolder, 'thumbs', 't_' + page.number + '.jpg');

			let pageExists = false;
			try {
				await fs.access(pageFile);
				pageExists = true;
			} catch { }

			if (!pageExists) {
				const pageUrl = `${baseUrl}/api/v1/books/${bookId}/pages/${page.number}`;
				console.log(`Downloading page ${page.number}...`);
				const res = await fetch(pageUrl, requestData);
				if (!res.ok) throw new Error(`Failed to fetch page ${page.number}: ${res.status}`);
				const buffer = Buffer.from(await res.arrayBuffer());
				await fs.writeFile(pageFile, buffer);
			} else {
				console.log(`Page ${page.number} already exists, skipping.`);
			}

			let thumbExists = false;
			try {
				await fs.access(thumbFile);
				thumbExists = true;
			} catch { }

			if (!thumbExists) {
				const thumbUrl = `${baseUrl}/api/v1/books/${bookId}/pages/${page.number}/thumbnail`;
				console.log(`Downloading thumb ${page.number}...`);
				const res2 = await fetch(thumbUrl, requestData);
				if (!res2.ok) throw new Error(`Failed to fetch thumbnail ${page.number}: ${res.status}`);
				const buffer2 = Buffer.from(await res2.arrayBuffer());
				await fs.writeFile(thumbFile, buffer2);
			} else {
				console.log(`Thumb ${page.number} already exists, skipping.`);
			}

			completed++;

			win.webContents.send('download-progress', {
				bookId,
				completed,
				total: bookMeta.media.pagesCount,
			});
		}

		console.log(`Downloaded and stored book: ${bookTitle} (${bookId})`);
		win.webContents.send('download-complete', {
			bookId,
			completed,
			total: bookMeta.media.pagesCount,
		});

		return { ok: true, path: bookFolder };
	} catch (err) {
		console.error('Download failed:', err);
		return { ok: false, error: err.message };
	}
});

