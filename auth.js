// script.js
async function sessionCheck() {
	const baseUrl = localStorage.getItem('mbBaseUrl');
	if (!baseUrl) {
		showLoginDialog();
		return;
	}

	try {
		const response = await fetch(`${baseUrl}/api/v1/user/me`, {
			method: 'GET',
			credentials: 'include', // Important: send cookies!
			headers: {
				//'Authorization': 'Basic dummy', // trick to prevent popup
				'skip_zrok_interstitial': '1'
			}
		});
		if (response.ok) {
			console.log("SESSION IS ON")
			// Session is alive, proceed
			hideLoginDialog();

			// fetch libraries or continue normal flow
		} else {
			console.log("SESSION EXPIRED")
			// Session expired or invalid
			showLoginDialog();
		}
	} catch (e) {
		console.error('Error checking session', e);
		showLoginDialog();
	}
}

sessionCheck()

function login() {
	let baseUrlVal = loginBaseUrl.value;

	if (!/^https?:\/\//i.test(baseUrlVal)) {
		// Add http:// if no protocol is present
		baseUrlVal = 'https://' + baseUrlVal;
	}

	baseUrlVal = baseUrlVal.replace(/\/$/, '');

	const mbAuthHeader = 'Basic ' + btoa(`${loginUsername.value}:${loginPassword.value}`);

	// Test the auth header and base URL with a simple API call to validate credentials
	fetch(`${baseUrlVal}/api/v1/login/set-cookie?remember-me=true`, {
		method: 'GET',
		headers: {
			'Authorization': mbAuthHeader,
			'skip_zrok_interstitial': '1'
		}
	})
		.then(response => {
			console.log(response);
			if (response.ok) {
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
