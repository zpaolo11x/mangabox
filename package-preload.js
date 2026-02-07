// preload.js
const { contextBridge, ipcRenderer } = require('electron');
const keytar = require('keytar');

contextBridge.exposeInMainWorld('electronAPI', {
	// Window functions
	minimize: () =>
		ipcRenderer.send('window-minimize'),
	maximize: () =>
		ipcRenderer.send('window-maximize'),
	close: () =>
		ipcRenderer.send('window-close'),

	// Fullscreen management
	onFullscreenChange: (callback) =>
		ipcRenderer.on('fullscreen-changed', (_, isFullscreen) => callback(isFullscreen)),
	onMaximize: (callback) =>
		ipcRenderer.on('window-maximized', callback),
	onUnmaximize: (callback) =>
		ipcRenderer.on('window-unmaximized', callback),

	// App version
	getAppVersion: () =>
		ipcRenderer.invoke('get-app-version'),

	// File access
	readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

});

contextBridge.exposeInMainWorld('secureStore', {
	setCredentials: async (account, secret) => {
		return await keytar.setPassword('MangaBox', account, secret);
	},
	getCredentials: async (account) => {
		return await keytar.getPassword('MangaBox', account);
	},
	deleteCredentials: async (account) => {
		return await keytar.deletePassword('MangaBox', account);
	},
	checkCredentials2: async () => {
		const creds = await keytar.findCredentials('MangaBox-server');
		if (!creds || creds.length === 0) {
			return null;
		}
		if (creds.length > 1) {
			console.warn('Multiple credentials found, using the first one');
		}
		return creds[0].account;
	},

	setCredentials2: async (serverId, password) => {
		return keytar.setPassword('MangaBox-server', serverId, password);
	},
	getCredentials2: async (serverId) => {
		return keytar.getPassword('MangaBox-server', serverId);
	},
	deleteCredentials2: async (serverId) => {
		return keytar.deletePassword('MangaBox-server', serverId);
	}
});


ipcRenderer.on('download-complete', (_, data) => {
	window.dispatchEvent(new CustomEvent('download-complete', { detail: data }));
});


ipcRenderer.on('download-progress', (_, data) => {
	window.dispatchEvent(new CustomEvent('download-progress', { detail: data }));
});

contextBridge.exposeInMainWorld('offlineAPI', {
	downloadBook: (info) =>
		ipcRenderer.invoke('download-and-store-book', info),

	onDownloadError: (callback) =>
		ipcRenderer.on('download-error', (_, data) => callback(data)),

	getOfflineBookData: async (bookId) => {
		return await ipcRenderer.invoke('get-offline-book-data', bookId);
	},

	deleteOfflineBookData: async (bookId) => {
		return await ipcRenderer.invoke('delete-offline-book-data', bookId);
	},

});