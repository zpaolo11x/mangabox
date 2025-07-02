// script.js
async function saveToken() {
	await window.secureStore.setCredentials('auth', mb.authToken);
	alert("Token saved securely.");
}

async function loadToken() {
	const token = await window.secureStore.getCredentials('auth');
	if (token) {
		alert("Token loaded: " + token);
		return(token);
	} else {
		alert("No token found.");
		return(null);
	}
}

async function deleteTolen() {
	await window.secureStore.deleteCredentials('mangabox');
	alert ("Token deleted.");
}

async function sessionCheck() {
	const baseUrl = localStorage.getItem('mbBaseUrl');
	
	const authToken = loadToken();
	//const authToken = localStorage.getItem('mbAuthToken');

	if ((!baseUrl) || (!authToken)){
		showLoginDialog();
		return;
	}

	try {
		const response = await fetch(`${baseUrl}/api/v1/login/set-cookie`, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'X-Auth-Token': authToken,
				'X-Requested-With': 'XMLHttpRequest',
				'skip_zrok_interstitial': '1'
			}
		});
		if (response.ok) {
			hideLoginDialog();
			bootSequence();
		} else {
			showLoginDialog();
		}
	} catch (error) {
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
		.then(response => {
			const token = response.headers.get('X-Auth-Token');
			console.log(token);
			if (response.ok && token) {
				console.log("✅ Got session token:", token);
				localStorage.setItem('mbBaseUrl', baseUrlVal);
				localStorage.setItem('mbAuthToken', token);
				hideLoginDialog();
				location.reload(true);
				//fetchLibraries(); // Fetch libraries after successful login
			} else {
				localStorage.setItem('mbBaseUrl', baseUrlVal);       // Save base URL
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
