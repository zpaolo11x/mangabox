// script.js

async function saveTokenCordova(token) {
	secureStore.set(
		() => debugPrint('Token saved securely\n'),
		(err) => debugPrint('Failed to save token: ' + err + "\n"),
		'auth_token',
		token
	);
}

async function loadTokenCordova(token) {
	// Read token later
	secureStore.get(
		(value) => {
			debugPrint('Loaded token: ' + value);
			useToken(value);
		},
		(err) => debugPrint('Token read failed: ' + err),
		'auth_token'
	);
}

async function saveTokenElectron(token) {
	await window.secureStore.setCredentials('auth', token);
}

async function loadTokenElectron() {
	const token = await window.secureStore.getCredentials('auth');
	if (token) {
		return (token);
	} else {
		return (false);
	}
}

async function deleteTokenElectron() {
	await window.secureStore.deleteCredentials('auth');
}

async function sessionCheck() {
	debugPrint("CORDOVA CHECK: \n");
	debugPrint(window.cordova + "\n\n");
	debugPrint('sessionCheck\n');
	loginBaseUrl.value = mb.baseUrl;

	if (isElectronApp) {
			debugPrint("session is Electron \n");

		mb.authToken = await loadTokenElectron();
	} else if (isCordova) {
			debugPrint("session is Cordova \n");

		mb.authToken = localStorage.getItem('mbAuthToken');
	} else {
			debugPrint("session is PWA \n");

		mb.authToken = true;
	}
	
	debugPrint("auth token \n");
	debugPrint(mb.authToken + "\n\n");

	debugPrint('Loaded auth token: ' + mb.authToken + '\n');

	// Check for missing credentials
	if (!mb.baseUrl || !mb.authToken) {
		showLoginDialog();
		return;
	}

	// Setup fetch or HTTP call
	if (isCordova) {
		debugPrint("Is Cordova\n")
		// Native HTTP plugin call
		cordova.plugin.http.sendRequest(
			`${mb.baseUrl}/api/v1/login/set-cookie`,
			{
				method: 'get',
				headers: {
					'X-Auth-Token': mb.authToken,
					'X-Requested-With': 'XMLHttpRequest',
					'skip_zrok_interstitial': '1'
				}
			},
			function (response) {
				debugPrint("Response: " + response.status + "\n")

				if (response.status >= 200 && response.status < 300) {
					hideLoginDialog();
					bootSequence();
				} else {
					showLoginDialog();
				}
			},
			function (error) {
				debugPrint("Response error\n")

				debugPrint('Cordova HTTP error: ' + JSON.stringify(error));
				showLoginDialog();
			}
		);
	} else {
		// Web / Electron fetch
		debugPrint("Is NOT Cordova\n")
		const fetchPayload = isElectronApp
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
				hideLoginDialog();
				bootSequence();
			} else {
				showLoginDialog();
			}
		} catch (error) {
			debugPrint('Fetch error: ' + error);
			showLoginDialog();
		}
	}
}


function login() {
	let baseUrlVal = loginBaseUrl.value;

	baseUrlVal = 'https://aerobox.freeddns.it/komga' //XXX

	if (!/^https?:\/\//i.test(baseUrlVal)) {
		// Add http:// if no protocol is present
		baseUrlVal = 'https://' + baseUrlVal;
	}

	baseUrlVal = baseUrlVal.replace(/\/$/, '');

	let mbAuthHeader = 'Basic ' + btoa(`${loginUsername.value}:${loginPassword.value}`);

	mbAuthHeader = 'Basic ' + btoa('testuser@test.com:test'); //XXX

	// Test the auth header and base URL with a simple API call to validate credentials

	/*
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
			if (response.ok && token) {
				localStorage.setItem('mbBaseUrl', baseUrlVal);
				if (isElectronApp) {
					window.electronAPI.sendRememberMe(loginRememberMe.checked);
					await saveTokenElectron(token);
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
*/
	debugPrint('>>> about to call cordova.plugin.http.sendRequest');

	cordova.plugin.http.sendRequest(
		`https://aerobox.freeddns.it/komga/api/v1/login/set-cookie${loginRememberMe.checked ? '?remember-me=true' : ''}`,
		{
			method: 'get',
			headers: {
				'Authorization': mbAuthHeader,
				'X-Requested-With': 'XMLHttpRequest',
				'X-Auth-Token': '',
				'skip_zrok_interstitial': '1',
			}
		},
		function (response) {
			const token = response.headers['x-auth-token'];
			const responseOk = (response.status === 204);

			debugPrint('Token: ' + token);

			if (responseOk && token) {
				localStorage.setItem('mbBaseUrl', baseUrlVal);

				saveTokenCordova(token).then(() => {
					debugPrint("Token saved\n");
					hideLoginDialog();
					location.reload(true);
				}).catch((e) => {
					debugPrint('Token save error: ' + e + '\n');
					debugPrint('Saving to local storage\n')
					localStorage.setItem('mbAuthToken', token); // fallback (not secure)
					hideLoginDialog();
					location.reload(true);
				});
			}

			debugPrint('>>> SUCCESS callback called');
			debugPrint("\n");
			debugPrint('Status:\n' + response.status);
			debugPrint("\n");
			debugPrint('Headers:\n' + JSON.stringify(response.headers));
			debugPrint("\n");
			debugPrint('Data:\n' + response.data);
			debugPrint("\n");
		},
		function (error) {
			debugPrint('>>> ERROR callback called');
			debugPrint(JSON.stringify(error));
		}
	);

	debugPrint('>>> after sendRequest call');

}

function showLoginDialog() {
	loginScreen.classList.remove('auth-hidden');
}

function hideLoginDialog() {
	loginScreen.classList.add('auth-hidden');
}
