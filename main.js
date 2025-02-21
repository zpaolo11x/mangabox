const { app, BrowserWindow } = require('electron');

let splash;
let mainWindow;

app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');

app.on('ready', () => {

	    // Create the splash screen
		 splash = new BrowserWindow({
			width: 400,
			height: 300,
			frame: false, // No window frame
			alwaysOnTop: true, // Keep above other windows
			transparent: true, // Use a transparent background if needed
			resizable: false,
	  });
	  splash.loadFile('splash.html'); // Load your splash screen file
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
	 show:false,
	 autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
		allowRunningInsecureContent: true
    },
	 
  });

  mainWindow.loadFile('index.html'); // Replace 'index.html' with your main HTML file name
  mainWindow.webContents.setVisualZoomLevelLimits(1, 5);

  setTimeout(() => {
	splash.close();
	mainWindow.show();
}, 3000); // Adjust delay as needed

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
