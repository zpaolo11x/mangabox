// script.js

// Show the login dialog if no auth header or base URL is available
if (!localStorage.getItem('mbAuthHeader') || !localStorage.getItem('mbBaseUrl')) {
	if (localStorage.getItem('mbBaseUrl')) {
		document.getElementById('mbBaseUrl').value = localStorage.getItem('mbBaseUrl');
	}
	showLoginDialog();
}

function login() {
	let mbBaseUrl = document.getElementById('mbBaseUrl').value;
	const username = document.getElementById('username').value;
	const password = document.getElementById('password').value;
	const rememberMe = document.getElementById('rememberMe').checked;

	if (!/^https?:\/\//i.test(mbBaseUrl)) {
		// Add http:// if no protocol is present
		mbBaseUrl = 'https://' + mbBaseUrl;
	}

	mbBaseUrl = mbBaseUrl.replace(/\/$/, '');

	const mbAuthHeader = 'Basic ' + btoa(`${username}:${password}`);

	// Test the auth header and base URL with a simple API call to validate credentials
	fetch(`${mbBaseUrl}/api/v1/login/set-cookie`, {
		method: 'GET',
		headers: { 
			'Authorization': mbAuthHeader,
			'skip_zrok_interstitial': '1'
		 }
	})
		.then(response => {
			console.log(response);
			if (response.ok) {
				localStorage.setItem('mbRememberMe', rememberMe);
				localStorage.setItem('mbAuthHeader', mbAuthHeader); // Save auth header
				localStorage.setItem('mbBaseUrl', mbBaseUrl);       // Save base URL
				hideLoginDialog();
				location.reload(true);
				//fetchLibraries(); // Fetch libraries after successful login
			} else {
				localStorage.setItem('mbBaseUrl', mbBaseUrl);       // Save base URL
				document.getElementById('loginError').classList.remove('auth-hidden'); // Show error message
			}
		})
		.catch(error => {
			console.error('Login error:', error);
			document.getElementById('loginError').classList.remove('auth-hidden');
		});
}

function showLoginDialog() {
	document.getElementById('loginScreen').classList.remove('auth-hidden');
}

function hideLoginDialog() {
	document.getElementById('loginScreen').classList.add('auth-hidden');
}
