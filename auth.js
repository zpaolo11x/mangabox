// script.js
async function sessionCheck_TEST() {
	const baseUrl = localStorage.getItem('mbBaseUrl');
	const sessionToken = localStorage.getItem('mbToken');
	const inSession = localStorage.getItem('mbInSession') == 'true';
	const rememberMe = localStorage.getItem('mbRememberMe') == 'true';
	
	console.log(sessionToken);
console.log(inSession);
console.log(rememberMe);
console.log(inSession && (!rememberMe));
	if ((!baseUrl) || (!inSession) || (inSession && !rememberMe)) {
		console.log("NO URL NO TOKEN")
		localStorage.removeItem('mbRememberMe');
		localStorage.removeItem('mbInSession');
		showLoginDialog();
		return;
	} else {
		console.log("BOOT")
		bootSequence();		
	}
}

async function sessionCheck() {
	const baseUrl = localStorage.getItem('mbBaseUrl');
	if (!baseUrl) {
		showLoginDialog();
		return;
	}

	try {
		const response = await fetch(`${baseUrl}/api/v1/login/set-cookie`, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'skip_zrok_interstitial': '1'
			}
		});
		if (response.ok) {
			console.log('✅ Session is valid');
			hideLoginDialog();
			bootSequence();
			// Proceed to fetch data or render main UI
		} else {
			console.log('❌ Session invalid or expired');
			showLoginDialog();
		}
	} catch (error) {
		console.error('⚠️ Error checking session:', error);
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

	console.log("checked:"+loginRememberMe.checked);

	fetch(`${baseUrlVal}/api/v1/login/set-cookie${loginRememberMe.checked ? '?remember-me=true' : ''}`, {
		method: 'GET',
		headers: {
			'Authorization': mbAuthHeader,
			'X-Auth-Token': '',
			'skip_zrok_interstitial': '1'
		}
	})
		.then(response => {
			const token = response.headers.get('X-Auth-Token');
			console.log(token);
			if (response.ok && token) {
				console.log("✅ Got session token:", token);
				localStorage.setItem('mbToken', token);
				localStorage.setItem('mbBaseUrl', baseUrlVal);
				localStorage.setItem('mbInSession', true);
				localStorage.setItem('mbRememberMe', loginRememberMe.checked);
				hideLoginDialog();
				location.reload(true);
				//fetchLibraries(); // Fetch libraries after successful login
			} else {
				localStorage.setItem('mbBaseUrl', baseUrlVal);       // Save base URL
				loginError.classList.remove('auth-hidden'); // Show error message
				localStorage.removeItem('mbInSession');
				localStorage.removeItem('mbRememberMe');
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
