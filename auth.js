// script.js

async function saveToken(token) {
	await window.secureStore.setCredentials('auth', token);
}

async function loadToken() {
	const token = await window.secureStore.getCredentials('auth');
	if (token) {
		return (token);
	} else {
		return (false);
	}
}

async function deleteToken() {
	await window.secureStore.deleteCredentials('auth');
}

async function sessionCheck() {
	loginBaseUrl.value = mb.baseUrl;

	mb.authToken = isElectronApp ? await loadToken() : true;

	if ((!mb.baseUrl) || (!mb.authToken)) {
		showLoginDialog();
		return;
	}

	const fetchPayload = isElectronApp ?
		{
			method: 'GET',
			headers: {
				'X-Auth-Token': mb.authToken,
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
		const response = await fetch(`${mb.baseUrl}/api/v1/login/set-cookie`, fetchPayload);
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

	/*
	fetch(`${baseUrlVal}/api/v1/login/set-cookie${loginRememberMe.checked ? '?remember-me=true' : ''}`, {
		method: 'GET',
		//credentials: 'include', // ✅ Important!
		headers: {
			//'Authorization': mbAuthHeader,
			'Authorization': 'Basic ' + btoa(`testuser@test.com:test`),
			'X-Requested-With': 'XMLHttpRequest',
			'X-Auth-Token': '',
			'skip_zrok_interstitial': '1'
		}
	})
		.then(async response => {
			debugPrint(response.ok);
			const token = response.headers.get('X-Auth-Token');
			if (response.ok && token) {
				localStorage.setItem('mbBaseUrl', baseUrlVal);
				if (isElectronApp) {
					window.electronAPI.sendRememberMe(loginRememberMe.checked);
					await saveToken(token);
				}
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
*/
 
(async () => {
  try {
    debugPrint("START CALL");

    const response = await cordova.plugin.http.sendRequest(
      `https://aerobox.freeddns.it/komga/api/v1/login/set-cookie${loginRememberMe.checked ? '?remember-me=true' : ''}`,
      {
        method: 'get',
        headers: {
          'Authorization': mbAuthHeader,
          'X-Requested-With': 'XMLHttpRequest',
          'skip_zrok_interstitial': '1'
        }
      }
    );

    debugPrint("RESPONSE DONE");
    debugPrint(response.status);

    const token = response.headers['x-auth-token'];

    if (response.status === 200 && token) {
      // Your success logic
    } else {
      loginError.classList.remove('auth-hidden');
    }
  } catch (err) {
    debugPrint('Caught error: ' + JSON.stringify(err));
    loginError.classList.remove('auth-hidden');
  }
})();


}

function showLoginDialog() {
	loginScreen.classList.remove('auth-hidden');
}

function hideLoginDialog() {
	loginScreen.classList.add('auth-hidden');
}
