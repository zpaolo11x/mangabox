// Main application class
class MangaBox {
  constructor(options = {}) {
    // Configuration
    this.config = {
      containerSelector: options.containerSelector || '#app',
      defaultView: options.defaultView || 'login',
      ...options
    };
    
    // DOM references
    this.container = document.querySelector(this.config.containerSelector);
    
    // Component instances
    this.auth = new AuthManager(this);
    this.api = new KomgaAPI(this);
    this.uiManager = new UIManager(this);
    this.reader = new ComicReader(this);
    this.navigator = new NavigationManager(this);
    this.settings = new SettingsManager(this);
    
    // State
    this.currentView = null;
    this.currentLibrary = null;
    this.currentSeries = null;
    this.currentBook = null;
    
    // Initialize the application
    this.init();
  }
  
  init() {
    // Load saved settings
    this.settings.loadFromStorage();
    
    // Check for saved authentication
    if (this.auth.hasValidSession()) {
      this.showLibraryView();
    } else {
      this.showLoginView();
    }
    
    // Set up global event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  handleKeyPress(event) {
    // Route keyboard events to appropriate components
    if (this.currentView === 'reader') {
      this.reader.handleKeyPress(event);
    }
  }
  
  handleResize() {
    // Route resize events
    if (this.currentView === 'reader') {
      this.reader.handleResize();
    }
  }
  
  showLoginView() {
    this.currentView = 'login';
    this.uiManager.renderView('login');
  }
  
  showLibraryView() {
    this.currentView = 'library';
    this.api.getLibraries()
      .then(libraries => {
        this.uiManager.renderView('library', { libraries });
      })
      .catch(error => this.uiManager.showError(error.message));
  }
  
  showSeriesView(libraryId) {
    this.currentView = 'series';
    this.currentLibrary = libraryId;
    
    this.api.getSeries(libraryId)
      .then(series => {
        this.uiManager.renderView('series', { series });
      })
      .catch(error => this.uiManager.showError(error.message));
  }
  
  showBookView(seriesId) {
    this.currentView = 'books';
    this.currentSeries = seriesId;
    
    this.api.getBooks(seriesId)
      .then(books => {
        this.uiManager.renderView('books', { books });
      })
      .catch(error => this.uiManager.showError(error.message));
  }
  
  openReader(bookId) {
    this.currentView = 'reader';
    this.currentBook = bookId;
    
    this.api.getBookPages(bookId)
      .then(pages => {
        this.reader.openBook(bookId, pages);
        this.uiManager.renderView('reader');
      })
      .catch(error => this.uiManager.showError(error.message));
  }
}

// Authentication management
class AuthManager {
  constructor(app) {
    this.app = app;
    this.serverUrl = null;
    this.username = null;
    this.password = null;
    this.token = null;
  }
  
  login(serverUrl, username, password) {
    this.serverUrl = serverUrl;
    this.username = username;
    
    return this.app.api.testConnection(serverUrl, username, password)
      .then(() => {
        // Generate token and save credentials
        this.token = btoa(`${username}:${password}`);
        this.saveToStorage();
        return true;
      });
  }
  
  logout() {
    this.token = null;
    this.username = null;
    this.password = null;
    this.clearStorage();
    this.app.showLoginView();
  }
  
  getAuthHeaders() {
    return {
      'Authorization': `Basic ${this.token}`
    };
  }
  
  hasValidSession() {
    const savedToken = localStorage.getItem('komga_token');
    const savedUrl = localStorage.getItem('komga_url');
    
    if (savedToken && savedUrl) {
      this.token = savedToken;
      this.serverUrl = savedUrl;
      this.username = localStorage.getItem('komga_username');
      return true;
    }
    
    return false;
  }
  
  saveToStorage() {
    localStorage.setItem('komga_token', this.token);
    localStorage.setItem('komga_url', this.serverUrl);
    localStorage.setItem('komga_username', this.username);
  }
  
  clearStorage() {
    localStorage.removeItem('komga_token');
    localStorage.removeItem('komga_url');
    localStorage.removeItem('komga_username');
  }
}

// API communication
class KomgaAPI {
  constructor(app) {
    this.app = app;
  }
  
  getBaseURL() {
    return this.app.auth.serverUrl;
  }
  
  getAuthHeaders() {
    return this.app.auth.getAuthHeaders();
  }
  
  async fetchAPI(endpoint, options = {}) {
    const url = `${this.getBaseURL()}${endpoint}`;
    
    const requestOptions = {
      headers: {
        ...this.getAuthHeaders(),
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    };
    
    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `Error: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
  
  async testConnection(url, username, password) {
    const token = btoa(`${username}:${password}`);
    
    const response = await fetch(`${url}/api/v1/libraries`, {
      headers: {
        'Authorization': `Basic ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to connect to Komga server');
    }
    
    return true;
  }
  
  getLibraries() {
    return this.fetchAPI('/api/v1/libraries');
  }
  
  getSeries(libraryId) {
    return this.fetchAPI(`/api/v1/libraries/${libraryId}/series`);
  }
  
  getBooks(seriesId) {
    return this.fetchAPI(`/api/v1/series/${seriesId}/books`);
  }
  
  getBookPages(bookId) {
    return this.fetchAPI(`/api/v1/books/${bookId}/pages`);
  }
  
  getPageContent(bookId, pageNumber) {
    return `${this.getBaseURL()}/api/v1/books/${bookId}/pages/${pageNumber}/content`;
  }
}

// UI rendering
class UIManager {
  constructor(app) {
    this.app = app;
    this.templates = {
      login: this.createLoginTemplate(),
      library: this.createLibraryTemplate(),
      series: this.createSeriesTemplate(),
      books: this.createBooksTemplate(),
      reader: this.createReaderTemplate(),
      settings: this.createSettingsTemplate(),
      error: this.createErrorTemplate()
    };
  }
  
  renderView(viewName, data = {}) {
    const template = this.templates[viewName];
    
    if (!template) {
      console.error(`Template not found: ${viewName}`);
      return;
    }
    
    // Clear container and render new view
    this.app.container.innerHTML = '';
    this.app.container.appendChild(template(data));
    
    // Set up event listeners specific to this view
    this.setupViewListeners(viewName);
  }
  
  setupViewListeners(viewName) {
    switch (viewName) {
      case 'login':
        this.setupLoginListeners();
        break;
      case 'library':
        this.setupLibraryListeners();
        break;
      // Add cases for other views
    }
  }
  
  setupLoginListeners() {
    const form = document.querySelector('#login-form');
    
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      
      const serverUrl = document.querySelector('#server-url').value;
      const username = document.querySelector('#username').value;
      const password = document.querySelector('#password').value;
      
      this.app.auth.login(serverUrl, username, password)
        .then(() => this.app.showLibraryView())
        .catch(error => this.showError(error.message));
    });
  }
  
  setupLibraryListeners() {
    const libraries = document.querySelectorAll('.library-item');
    
    libraries.forEach(library => {
      library.addEventListener('click', () => {
        const libraryId = library.dataset.id;
        this.app.showSeriesView(libraryId);
      });
    });
  }
  
  showError(message) {
    const errorContainer = document.querySelector('.error-container') || document.createElement('div');
    errorContainer.className = 'error-container';
    errorContainer.textContent = message;
    
    if (!document.querySelector('.error-container')) {
      this.app.container.prepend(errorContainer);
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorContainer.remove();
    }, 5000);
  }
  
  // Template creation methods
  createLoginTemplate() {
    return (data) => {
      const div = document.createElement('div');
      div.className = 'login-container';
      div.innerHTML = `
        <h1>MangaBox</h1>
        <form id="login-form">
          <div class="form-group">
            <label for="server-url">Komga Server URL</label>
            <input type="url" id="server-url" required>
          </div>
          <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" required>
          </div>
          <button type="submit">Login</button>
        </form>
      `;
      return div;
    };
  }
  
  createLibraryTemplate() {
    return (data) => {
      const div = document.createElement('div');
      div.className = 'library-container';
      
      const libraries = data.libraries || [];
      
      div.innerHTML = `
        <header>
          <h1>Libraries</h1>
          <button class="settings-button">Settings</button>
          <button class="logout-button">Logout</button>
        </header>
        <div class="libraries-grid">
          ${libraries.map(library => `
            <div class="library-item" data-id="${library.id}">
              <h2>${library.name}</h2>
            </div>
          `).join('')}
        </div>
      `;
      
      return div;
    };
  }
  
  // Additional template methods would be defined here
  createSeriesTemplate() {
    // Similar implementation to library template
    return (data) => document.createElement('div');
  }
  
  createBooksTemplate() {
    // Similar implementation
    return (data) => document.createElement('div');
  }
  
  createReaderTemplate() {
    return (data) => {
      const div = document.createElement('div');
      div.className = 'reader-container';
      div.innerHTML = `
        <div class="reader-controls">
          <button class="back-button">Back</button>
          <div class="page-info">Page <span class="current-page">0</span> of <span class="total-pages">0</span></div>
        </div>
        <div class="reader-view"></div>
      `;
      return div;
    };
  }
  
  createSettingsTemplate() {
    return () => document.createElement('div');
  }
  
  createErrorTemplate() {
    return () => document.createElement('div');
  }
}

// Comic reader functionality
class ComicReader {
  constructor(app) {
    this.app = app;
    this.currentBookId = null;
    this.pages = [];
    this.currentPage = 0;
    this.totalPages = 0;
    this.readerView = null;
    this.imageCache = new Map();
    this.preloadCount = 2; // Number of pages to preload ahead
    
    // Reader state
    this.zoomLevel = 1.0;
    this.viewMode = 'fit-width'; // 'fit-width', 'fit-height', 'fit-page'
  }
  
  openBook(bookId, pages) {
    this.currentBookId = bookId;
    this.pages = pages;
    this.totalPages = pages.length;
    this.currentPage = 0;
    
    // Clear cache when opening a new book
    this.imageCache.clear();
    
    // Wait for reader view to be rendered
    setTimeout(() => {
      this.readerView = document.querySelector('.reader-view');
      this.updatePageInfo();
      this.loadCurrentPage();
      this.preloadPages();
    }, 0);
  }
  
  loadCurrentPage() {
    if (!this.readerView) return;
    
    const pageUrl = this.app.api.getPageContent(this.currentBookId, this.currentPage);
    
    // Check cache first
    if (this.imageCache.has(pageUrl)) {
      const img = this.imageCache.get(pageUrl);
      this.displayImage(img);
      return;
    }
    
    // Load image
    const img = new Image();
    img.onload = () => {
      this.imageCache.set(pageUrl, img);
      this.displayImage(img);
    };
    img.onerror = () => {
      this.readerView.innerHTML = '<div class="error">Failed to load image</div>';
    };
    img.src = pageUrl;
  }
  
  displayImage(img) {
    this.readerView.innerHTML = '';
    
    const clone = img.cloneNode(true);
    clone.className = 'reader-image';
    
    // Apply view mode
    clone.style.maxWidth = this.viewMode === 'fit-width' ? '100%' : 'auto';
    clone.style.maxHeight = this.viewMode === 'fit-height' ? '100%' : 'auto';
    clone.style.transform = `scale(${this.zoomLevel})`;
    
    this.readerView.appendChild(clone);
  }
  
  preloadPages() {
    // Preload next pages
    for (let i = 1; i <= this.preloadCount; i++) {
      const pageToPreload = this.currentPage + i;
      
      if (pageToPreload < this.totalPages) {
        const pageUrl = this.app.api.getPageContent(this.currentBookId, pageToPreload);
        
        if (!this.imageCache.has(pageUrl)) {
          const img = new Image();
          img.src = pageUrl;
          this.imageCache.set(pageUrl, img);
        }
      }
    }
  }
  
  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadCurrentPage();
      this.preloadPages();
      this.updatePageInfo();
    }
  }
  
  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadCurrentPage();
      this.preloadPages();
      this.updatePageInfo();
    }
  }
  
  updatePageInfo() {
    const currentPageElement = document.querySelector('.current-page');
    const totalPagesElement = document.querySelector('.total-pages');
    
    if (currentPageElement) {
      currentPageElement.textContent = this.currentPage + 1;
    }
    
    if (totalPagesElement) {
      totalPagesElement.textContent = this.totalPages;
    }
  }
  
  handleKeyPress(event) {
    switch (event.key) {
      case 'ArrowRight':
        this.nextPage();
        break;
      case 'ArrowLeft':
        this.previousPage();
        break;
      case '+':
        this.zoomIn();
        break;
      case '-':
        this.zoomOut();
        break;
      case 'f':
        this.toggleFullscreen();
        break;
    }
  }
  
  handleResize() {
    // Re-render current image with proper sizing
    if (this.readerView && this.imageCache.size > 0) {
      this.loadCurrentPage();
    }
  }
  
  zoomIn() {
    this.zoomLevel = Math.min(this.zoomLevel + 0.1, 3.0);
    this.loadCurrentPage();
  }
  
  zoomOut() {
    this.zoomLevel = Math.max(this.zoomLevel - 0.1, 0.5);
    this.loadCurrentPage();
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.app.container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }
  
  setViewMode(mode) {
    this.viewMode = mode;
    this.loadCurrentPage();
  }
}

// Navigation manager
class NavigationManager {
  constructor(app) {
    this.app = app;
    this.history = [];
  }
  
  navigateTo(route, params = {}) {
    // Simple routing implementation
    switch (route) {
      case 'login':
        this.app.showLoginView();
        break;
      case 'library':
        this.app.showLibraryView();
        break;
      case 'series':
        this.app.showSeriesView(params.libraryId);
        break;
      case 'books':
        this.app.showBookView(params.seriesId);
        break;
      case 'reader':
        this.app.openReader(params.bookId);
        break;
    }
    
    // Save to history
    this.history.push({ route, params });
  }
  
  goBack() {
    // Remove current route
    this.history.pop();
    
    // Get previous route
    const previous = this.history.pop();
    
    if (previous) {
      this.navigateTo(previous.route, previous.params);
    } else {
      // Default to library view if no history
      this.navigateTo('library');
    }
  }
}

// Settings management
class SettingsManager {
  constructor(app) {
    this.app = app;
    
    // Default settings
    this.settings = {
      theme: 'light',
      readerViewMode: 'fit-width',
      pageTransition: 'slide',
      readingDirection: 'ltr'
    };
  }
  
  loadFromStorage() {
    const savedSettings = localStorage.getItem('mangabox_settings');
    
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        this.settings = { ...this.settings, ...parsed };
      } catch (e) {
        console.error('Failed to parse saved settings');
      }
    }
    
    // Apply settings
    this.applyTheme();
  }
  
  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveToStorage();
    
    // Apply setting
    switch (key) {
      case 'theme':
        this.applyTheme();
        break;
      case 'readerViewMode':
        if (this.app.reader) {
          this.app.reader.setViewMode(value);
        }
        break;
    }
  }
  
  saveToStorage() {
    localStorage.setItem('mangabox_settings', JSON.stringify(this.settings));
  }
  
  applyTheme() {
    document.body.dataset.theme = this.settings.theme;
  }
  
  showSettingsUI() {
    // Implement a settings UI
    this.app.uiManager.renderView('settings', { settings: this.settings });
  }
}

// Image preloader with LRU cache
class ImagePreloader {
  constructor(maxSize = 20) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  preload(url) {
    if (!this.cache.has(url)) {
      // If cache is full, remove oldest entry
      if (this.cache.size >= this.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
      
      // Create new image
      const img = new Image();
      img.src = url;
      
      // Add to cache
      this.cache.set(url, img);
    }
    
    return this.cache.get(url);
  }
  
  clear() {
    this.cache.clear();
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new MangaBox({
    containerSelector: '#app'
  });
});
