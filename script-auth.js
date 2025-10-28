// script.js
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
	debugPrint("sessionCheck...");
	console.log("sessionCheck...");

	loginBaseUrl.value = mb.baseUrl;

	// Load stored token (e.g. from Electron storage)
	mb.authToken = true;
	if (isElectron) mb.authToken = await loadToken();
	debugPrint("CURRENT TOKEN:\n" + mb.authToken);
	console.log("CURRENT TOKEN:\n" + mb.authToken);

	// --- 1. Missing credentials → login
	if ((!mb.baseUrl) || (!mb.authToken)) {
		debugPrint("Missing base URL or auth token");
		showLoginDialog();
		sectionHide(fader);
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
			sectionHide(fader);
			bootSequence('offline');
		} else {
			showLoginDialog();
			sectionHide(fader);
		}
		return;
	}

	// --- 3. Try validating the token
	let fetchPayload = (isElectron)
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
			console.log("Session valid (server confirmed).");
			localStorage.setItem("sessionValid", "true");
			hideLoginDialog();
			sectionHide(fader);
			bootSequence('online');

		} else if (response.status === 401 || response.status === 403) {
			debugPrint("Token invalid or expired.");
			console.log("Token invalid or expired.");
			localStorage.removeItem("sessionValid");
			showLoginDialog();
			sectionHide(fader);

		} else {
			debugPrint(`Unexpected server response (${response.status}) — assuming temporary issue.`);
			console.log(`Unexpected server response (${response.status}) — assuming temporary issue.`);
			if (sessionWasValid) {
				hideLoginDialog();
				bootSequence('offline');
				sectionHide(fader);

			} else {
				showLoginDialog();
				sectionHide(fader);
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
			sectionHide(fader);

		} else {
			showLoginDialog();
			sectionHide(fader);

		}
	}
}

async function login() {
	debugPrint("login...")
	console.log("login...")

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
			if (isElectron) {
				window.electronAPI.sendRememberMe(loginRememberMe.checked);
				await saveToken(token);
			}
			//hideLoginDialog();
			sectionShow(fader);

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
	console.log("showLoginDialog...")

	updatePWABar('#620417');
	loginScreen.classList.remove('auth-hidden');
}

function hideLoginDialog() {
	dragbar.classList.remove('onLogin');
	debugPrint("hideLoginDialog...")
	console.log("hideLoginDialog...")
	loginScreen.classList.add('auth-hidden');
}

function isLoginScreenHidden(){
	return (loginScreen.classList.contains('auth-hidden'));
}