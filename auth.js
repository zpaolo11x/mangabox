// script.js

let authToken = true;

async function saveToken(token) {
	await window.secureStore.setCredentials('auth', token);
	console.log("Token saved securely.");
}

async function loadToken() {
	const token = await window.secureStore.getCredentials('auth');
	if (token) {
		console.log("Token loaded: " + token);
		return (token);
	} else {
		console.log("No token found.");
		return (false);
	}
}

async function deleteToken() {
	await window.secureStore.deleteCredentials('auth');
	console.log("Token deleted.");
}

async function sessionCheck() {
	console.log("isElectronApp? "+isElectronApp);
	console.log("Start Session Check")
	const baseUrl = localStorage.getItem('mbBaseUrl');
	authToken = isElectronApp ? await loadToken() : true;

	console.log("*" + baseUrl + "* *" + authToken + "*");

	if ((!baseUrl) || (!authToken)) {
		console.log('Missing baseUrl or authToken');
		showLoginDialog();
		return;
	}

	const fetchPayload = isElectronApp ?
		{
			method: 'GET',
			headers: {
				'X-Auth-Token': authToken,
				'X-Requested-With': 'XMLHttpRequest',
				'skip_zrok_interstitial': '1'
			}
		} :
		{
			method: 'GET',
			credentials: 'include',
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'skip_zrok_interstitial': '1'
			}
		};

	try {
		const response = await fetch(`${baseUrl}/api/v1/login/set-cookie`, fetchPayload);
		if (response.ok) {
			console.log("Response OK")
			hideLoginDialog();
			bootSequence();
		} else {
			console.log("Response NOT OK")
			showLoginDialog();
		}
	} catch (error) {
		console.log('login error')
		showLoginDialog();
	}
}

function login() {
	let baseUrlVal = loginBaseUrl.value;

	if (!/^https?:\/\//i.test(baseUrlVal)) {
		// Add http:// if no protocol is present
		baseUrlVal = 'https://' + baseUrlVal;
	}

	baseUrlVal = baseUrlVal.replace(/\/$/, '');

	const mbAuthHeader = 'Basic ' + btoa(`${loginUsername.value}:${loginPassword.value}`);

	// Test the auth header and base URL with a simple API call to validate credentials

	fetch(`${baseUrlVal}/api/v1/login/set-cookie${loginRememberMe.checked ? '?remember-me=true' : ''}`, {
		method: 'GET',
		//credentials: 'include', // ✅ Important!
		headers: {
			'Authorization': mbAuthHeader,
			'X-Requested-With': 'XMLHttpRequest',
			'X-Auth-Token': '',
			'skip_zrok_interstitial': '1'
		}
	})
		.then(async response => {
			const token = response.headers.get('X-Auth-Token');
			console.log(token);
			if (response.ok && token) {
				localStorage.setItem('mbBaseUrl', baseUrlVal);
				if (isElectronApp) await saveToken(token);
				localStorage.setItem('mbRememberMe', loginRememberMe.checked);
				hideLoginDialog();
				location.reload(true);
			} else {
				localStorage.setItem('mbBaseUrl', baseUrlVal); // Save base URL
				loginError.classList.remove('auth-hidden'); // Show error message
			}
		})
		.catch(error => {
			console.error('Login error:', error);
			loginError.classList.remove('auth-hidden');
		});
}

function showLoginDialog() {
	loginScreen.classList.remove('auth-hidden');
}

function hideLoginDialog() {
	loginScreen.classList.add('auth-hidden');
}
