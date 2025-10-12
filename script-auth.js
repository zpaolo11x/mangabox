// script.js

async function saveToken(token) {
	debugPrint("saveToken...")
	await window.secureStore.setCredentials('auth', token);
}

async function loadToken() {
	debugPrint("loadToken...")
	const token = await window.secureStore.getCredentials('auth');
	debugPrint("Retrieved Token:" + token);
	if (token) {
		return (token);
	} else {
		return (false);
	}
}

async function deleteToken() {
	debugPrint("deleteToken...")

	await window.secureStore.deleteCredentials('auth');
}

async function sessionCheck() {
	debugPrint("sessionCheck...");

	loginBaseUrl.value = mb.baseUrl;

	// Load stored token (e.g. from Electron storage)
	mb.authToken = true;
	if (isElectronApp) mb.authToken = await loadToken();

	debugPrint("CURRENT TOKEN:\n" + mb.authToken);

	// --- 1. Missing credentials → login
	if ((!mb.baseUrl) || (!mb.authToken)) {
		debugPrint("Missing base URL or auth token");
		showLoginDialog();
		return;
	}

	// --- 2. Connectivity check (optional for immediate offline mode)
	const sessionWasValid = localStorage.getItem("sessionValid") === "true";
	let offline = !navigator.onLine;

	if (offline) {
		debugPrint("Offline mode detected.");
		if (sessionWasValid) {
			hideLoginDialog();
			bootSequence('offline');
		} else {
			showLoginDialog();
		}
		return;
	}

	// --- 3. Try validating the token
	let fetchPayload = (isElectronApp)
		? {
			method: 'GET',
			headers: {
				'X-Auth-Token': mb.authToken,
				'X-Requested-With': 'XMLHttpRequest',
				'skip_zrok_interstitial': '1'
			}
		}
		: {
			method: 'GET',
			credentials: 'include',
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'skip_zrok_interstitial': '1'
			}
		};

	try {
		const response = await fetch(`${mb.baseUrl}/api/v1/login/set-cookie`, fetchPayload);

		if (response.ok) {
			debugPrint("Session valid (server confirmed).");
			localStorage.setItem("sessionValid", "true");
			hideLoginDialog();
			bootSequence('online');
		} else if (response.status === 401 || response.status === 403) {
			debugPrint("Token invalid or expired.");
			localStorage.removeItem("sessionValid");
			showLoginDialog();
		} else {
			debugPrint(`Unexpected server response (${response.status}) — assuming temporary issue.`);
			if (sessionWasValid) {
				hideLoginDialog();
				bootSequence('offline');
			} else {
				showLoginDialog();
			}
		}
	} catch (error) {
		debugPrint("Session check failed: " + error);
		debugPrint("Treating as temporary network/server issue.");

		if (sessionWasValid) {
			hideLoginDialog();
			bootSequence('offline');
		} else {
			showLoginDialog();
		}
	}
}

async function login() {
	debugPrint("login...")

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
			localStorage.setItem('mbBaseUrl', baseUrlVal);
			if (isElectronApp) {
				window.electronAPI.sendRememberMe(loginRememberMe.checked);
				await saveToken(token);
			}
			hideLoginDialog();
			location.reload(true);
		} else if (response.status === 401) {
			loginError.textContent = 'Invalid username or password.';
			loginError.classList.remove('auth-hidden');
		} else {
			loginError.textContent = `Login failed (${response.status})`;
			loginError.classList.remove('auth-hidden');
		}
	}).catch(error => {
		console.error('Login error:', error);
		loginError.textContent = 'Cannot reach server. Check the address or your connection.';
		loginError.classList.remove('auth-hidden');
	});

}


function showLoginDialog() {
	debugPrint("showLoginDialog...")

	updatePWABar('white');
	loginScreen.classList.remove('auth-hidden');
}

function hideLoginDialog() {
	debugPrint("hideLoginDialog...")
	loginScreen.classList.add('auth-hidden');
}
