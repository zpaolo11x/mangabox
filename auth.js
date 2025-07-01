// script.js

async function sessionCheck() {

	const baseUrl = localStorage.getItem('mbBaseUrl');
	const sessionToken = localStorage.getItem('mbToken');

	if ((!baseUrl) || (!sessionToken)) {
		if (baseUrl) loginBaseUrl.value = baseUrl;
		console.log("NO URL OR NO TOKEN")
		showLoginDialog();
		return;
	} /*
	else {
		console.log("BOOT")
		bootSequence();		
	}
}
*/

	try {
		const response = await fetch(`${baseUrl}/api/v2/users/me`, {
			method: 'GET',
			headers: {
    			'X-Auth-Token': sessionToken,
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

	fetch(`${baseUrlVal}/api/v2/users/me`, {
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
