// script.js

// Show the login dialog if no auth header or base URL is available
if (!localStorage.getItem('mbAuthHeader') || !localStorage.getItem('mbBaseUrl')) {
	if (localStorage.getItem('mbBaseUrl')) {
		loginBaseUrl.value = localStorage.getItem('mbBaseUrl');
	}
	showLoginDialog();
}

function login() {
	let baseUrlVal = loginBaseUrl.value;
	const usernameVal = loginUsername.value;
	const passwordVal = loginPassword.value;
	const rememberMeVal = loginRememberMe.checked;

	if (!/^https?:\/\//i.test(baseUrlVal)) {
		// Add http:// if no protocol is present
		baseUrlVal = 'https://' + baseUrlVal;
	}

	baseUrlVal = baseUrlVal.replace(/\/$/, '');

	const mbAuthHeader = 'Basic ' + btoa(`${usernameVal}:${passwordVal}`);

	// Test the auth header and base URL with a simple API call to validate credentials
	fetch(`${baseUrlVal}/api/v1/login/set-cookie`, {
		method: 'GET',
		headers: {
			'Authorization': mbAuthHeader,
			'skip_zrok_interstitial': '1'
		}
	})
		.then(response => {
			console.log(response);
			if (response.ok) {
				localStorage.setItem('mbRememberMe', rememberMeVal);
				localStorage.setItem('mbAuthHeader', mbAuthHeader); // Save auth header
				localStorage.setItem('mbBaseUrl', baseUrlVal);       // Save base URL
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
