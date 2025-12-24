// script.js

async function checkSavedUser() {
	const user = await window.secureStore.checkCredentials2();
	return user;
}

async function saveUserPass(user, pass) {
	await window.secureStore.setCredentials2(user, pass);
}

async function loadUserPass(user) {
	const pass = await window.secureStore.getCredentials2(user);
	if (pass) {
		return (pass);
	} else {
		return (false);
	}
}

async function deleteUserPass(user) {
	await window.secureStore.deleteCredentials2(user);
}

async function saveToken(token) {
	debugPrint("saveToken...")
	console.log("saveToken...")
	await window.secureStore.setCredentials('auth', token);
}

async function loadToken() {
	debugPrint("loadToken...")
	console.log("loadToken...")
	const token = await window.secureStore.getCredentials('auth');
	debugPrint("Retrieved Token:" + token);
	console.log("Retrieved Token:" + token);
	if (token) {
		return (token);
	} else {
		return (false);
	}
}

async function deleteToken() {
	debugPrint("deleteToken...")
	console.log("deleteToken...")

	await window.secureStore.deleteCredentials('auth');
}

async function sessionCheck() {
	await executeFaderGradient(1);

	debugPrint("sessionCheck...");
	console.log("sessionCheck...");

	loginBaseUrl.value = mb.baseUrl;

	// Load stored token (e.g. from Electron storage)
	mb.loggedUser = 'cookie';
	if (isElectron) mb.loggedUser = await checkSavedUser();

console.log("Z - loggedUser:" + mb.loggedUser)
	
	// --- 1. Missing credentials → login
	if ((!mb.baseUrl) || (!mb.loggedUser)) {
		debugPrint("Missing base URL or auth token");
		showLoginDialog();
		await executeFaderGradient(0);
		return;
	}

	// --- 2. Connectivity check (optional for immediate offline mode)
	const sessionWasValid = localStorage.getItem("sessionValid") === "true";
	let offline = !navigator.onLine;

	if (offline) {
		debugPrint("Offline mode detected.");
		console.log("Offline mode detected.")
		if (sessionWasValid) {
			hideLoginDialog();
			bootSequence('offline');
		} else {
			showLoginDialog();
			await executeFaderGradient(0);
		}
		return;
	}

	// --- 3. Try validating the token
	let fetchPayload
	if (isElectron) {
		
		const username = mb.loggedUser;
		const password = await loadUserPass(mb.loggedUser);

		fetchPayload = {
			method: 'GET',
			headers: {
      		'Authorization': 'Basic ' + btoa(`${username}:${password}`),
				'X-Requested-With': 'XMLHttpRequest',
				'skip_zrok_interstitial': '1'
			}
		}
	} else {
		fetchPayload = {
			method: 'GET',
			credentials: 'include',
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'skip_zrok_interstitial': '1'
			}
		}
	}

	try {
		const response = await fetch(`${mb.baseUrl}/api/v1/login/set-cookie`, fetchPayload);

		if (response.ok) {
			debugPrint("Session valid (server confirmed).");
			console.log("Session valid (server confirmed).");
			localStorage.setItem("sessionValid", "true");
			hideLoginDialog();
			bootSequence('online');

		} else if (response.status === 401 || response.status === 403) {
			debugPrint("Token invalid or expired.");
			console.log("Token invalid or expired.");
			localStorage.removeItem("sessionValid");
			showLoginDialog();
			await executeFaderGradient(0);

		} else {
			debugPrint(`Unexpected server response (${response.status}) — assuming temporary issue.`);
			console.log(`Unexpected server response (${response.status}) — assuming temporary issue.`);
			if (sessionWasValid) {
				hideLoginDialog();
				bootSequence('offline');
				await executeFaderGradient(0);

			} else {
				showLoginDialog();
				await executeFaderGradient(0);
			}
		}
	} catch (error) {
		debugPrint("Session check failed: " + error);
		debugPrint("Treating as temporary network/server issue.");
		console.log("Session check failed: " + error);
		console.log("Treating as temporary network/server issue.");

		if (sessionWasValid) {
			hideLoginDialog();
			bootSequence('offline');
			await executeFaderGradient(0);

		} else {
			showLoginDialog();
			await executeFaderGradient(0);

		}
	}
}

async function systemRestart() {
	//TODO: This works and is quite good but it would be better to implement a navigateTo "login" for the login screen
	//TODO: and externalise the functions that are hear in a function that is called at boot or at login screen show

	// Reapply boot theme
	await executeFaderGradient(1);
	let toDark = mbPrefersDarkMode.matches ? true : false
	document.documentElement.setAttribute('data-theme', toDark ? 'dark' : 'light');

	loginScreen.classList = "auth-hidden logo-pattern";
	// Clear login dialog content
	loginBaseUrl.value = "";
	loginPassword.value = "";
	loginUsername.value = "";
	loginRememberMe.checked = false;
	loginError.textContent = '';
	if (!loginError.classList.contains('auth-hiden')) {
		loginError.classList.add('auth-hidden');
	}
	executeFade(1);

	if (isStatusBar) {
		if (isSharpCornerIphone) {
			Capacitor.Plugins.StatusBar.hide();
		} else {
			Capacitor.Plugins.StatusBar.show();
		}
	}

	//TODO Mettere qui distruzione library menu
	librariesList.innerHTML = '';
	extraButtons.innerHTML = '';

	//TODO Qui va ridefinizione di mb
	clearLibrariesMenus();

	mb = initMB();
	mb.filterTable = initFilterTable();

	mb.filterButtons = [
		mb.filterTable.sorting,
		mb.filterTable.filter_by_read,
		mb.filterTable.filter_by_direction,
		mb.filterTable.filter_by_language
	];

	buildFilters();
	//TODO Qui va ridefinizione di rd


	document.querySelectorAll('.section').forEach(section => sectionHide(section));
	document.querySelectorAll('.collector').forEach(item => item.remove());

	//In part useless because of the click outside events, but useful when loading an url
	sectionHide(filtersBar);
	sectionHide(colorSwatchBar);
	sectionHide(stickyContainer);

	mb.libMenuVisible = null;
	mb.swatchMenuVisible = false
	await updateSizer([])

	updateStickyMenu();


	offlineSession = false;
	document.documentElement.style.setProperty('--mb-h', '348');
	document.documentElement.style.setProperty('--mb-s', '92%');
	document.documentElement.style.setProperty('--mb-l', '38%');

	document.documentElement.style.setProperty('--mb-gradient-1', '30');
	document.documentElement.style.setProperty('--mb-gradient-2', '40');

	sessionCheck();
}


async function login() {
	debugPrint("login...")
	console.log("login...")

	loginError.classList.remove('auth-hidden');
	loginError.classList.add('auth-hidden');

	let baseUrlVal = loginBaseUrl.value;

	if (!/^https?:\/\//i.test(baseUrlVal)) {
		baseUrlVal = 'https://' + baseUrlVal;
	}
	baseUrlVal = baseUrlVal.replace(/\/$/, '');

	let mbAuthHeader = 'Basic ' + btoa(`${loginUsername.value}:${loginPassword.value}`);

	fetch(`${baseUrlVal}/api/v1/login/set-cookie${loginRememberMe.checked ? '?remember-me=true' : ''}`, {
		method: 'GET',
		credentials: 'include',
		headers: {
			'Authorization': mbAuthHeader,
			'X-Requested-With': 'XMLHttpRequest',
			'X-Auth-Token': '',
			'skip_zrok_interstitial': '1'
		}
	}).then(async response => {
		const token = response.headers.get('X-Auth-Token');
		if (response.ok && token) {
			await executeFaderGradient(1);
			localStorage.setItem('mbBaseUrl', baseUrlVal);
			if (isElectron) {
				window.electronAPI.sendRememberMe(loginRememberMe.checked);
				await saveUserPass(loginUsername.value, loginPassword.value);
			}
			systemRestart();
		} else if (response.status === 401) {
			loginError.textContent = `Invalid username or password.`;
			loginError.classList.remove('auth-hidden');
		} else {
			loginError.textContent = `Login failed`;
			loginError.classList.remove('auth-hidden');
		}
	}).catch(error => {
		console.error('Login error:', error);
		loginError.textContent = `Cannot reach server. Check the address or your connection. ${error}`;
		loginError.classList.remove('auth-hidden');
	});

}


function showLoginDialog() {
	dragbar.classList.add('onLogin');
	debugPrint("showLoginDialog...")
	console.log("showLoginDialog...")
	loginScreen.classList.remove('auth-hidden');
}

function hideLoginDialog() {
	dragbar.classList.remove('onLogin');
	debugPrint("hideLoginDialog...")
	console.log("hideLoginDialog...")
	loginScreen.classList.add('auth-hidden');
}

function isLoginScreenHidden() {
	return (loginScreen.classList.contains('auth-hidden'));
}
