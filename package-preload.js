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

	// Manage remember me
	sendRememberMe: (value) =>
		ipcRenderer.send('remember-me-state', value),

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
	}
});

contextBridge.exposeInMainWorld('offlineAPI', {
	downloadBook: (info) =>
		ipcRenderer.invoke('download-and-store-book', info),

	onDownloadProgress: (callback) =>
		ipcRenderer.on('download-progress', (_, data) => callback(data)),

	onDownloadError: (callback) =>
		ipcRenderer.on('download-error', (_, data) => callback(data)),

	onDownloadComplete: (callback) =>
		ipcRenderer.on('download-complete', (_, data) => callback(data)),

	getOfflineBookData: async (bookId) => {
		return await ipcRenderer.invoke('get-offline-book-data', bookId);
	},

});