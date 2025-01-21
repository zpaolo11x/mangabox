// script.js

// Show the login dialog if no auth header or base URL is available
if (!localStorage.getItem('mbAuthHeader') || !localStorage.getItem('mbBaseUrl')) {
	if (localStorage.getItem('mbBaseUrl')) {
		document.getElementById('mbBaseUrl').value = localStorage.getItem('mbBaseUrl');
	}
	showLoginDialog();
}

function login() {
	const mbBaseUrl = document.getElementById('mbBaseUrl').value;
	const username = document.getElementById('username').value;
	const password = document.getElementById('password').value;
	const rememberMe = document.getElementById('rememberMe').checked;

	const mbAuthHeader = 'Basic ' + btoa(`${username}:${password}`);

	// Test the auth header and base URL with a simple API call to validate credentials
	fetch(`${mbBaseUrl}/api/v1/libraries`, {
		headers: { 'Authorization': mbAuthHeader }
	})
		.then(response => {
			if (response.ok) {
				if (rememberMe) localStorage.setItem('mbRememberMe', rememberMe);
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

function loginTest() {
	const mbBaseUrl = document.getElementById('mbBaseUrl').value;
	const mbAuthHeader = 'Basic ' + btoa(`testuser@test.com:test`);

	// Test the auth header and base URL with a simple API call to validate credentials
	fetch(`${mbBaseUrl}/api/v1/libraries`, {
		headers: { 'Authorization': mbAuthHeader }
	})
		.then(response => {
			if (response.ok) {
				localStorage.setItem('mbAuthHeader', mbAuthHeader); // Save auth header
				localStorage.setItem('mbBaseUrl', mbBaseUrl);       // Save base URL
				hideLoginDialog();
				location.reload(true);
				//fetchLibraries(); // Fetch libraries after successful login
			} else {
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
/*
async function fetchLibraries() {
	const mbAuthHeader = localStorage.getItem('mbAuthHeader');
	const mbBaseUrl = localStorage.getItem('mbBaseUrl');

	if (!mbAuthHeader || !mbBaseUrl) {
		 showLoginDialog();
		 return;
	}

	try {
		 const response = await fetch(`${mbBaseUrl}/api/v1/libraries`, {
			  headers: { 'Authorization': mbAuthHeader }
		 });

		 if (response.ok) {
			  const data = await response.json();
			  console.log('Libraries:', data); // Handle the data as needed
		 } else if (response.status === 401) {
			  // Invalid or expired auth
			  localStorage.removeItem('mbAuthHeader');
			  localStorage.removeItem('mbBaseUrl');
			  showLoginDialog();
		 }
	} catch (error) {
		 console.error('Fetch libraries error:', error);
	}
}
*/