// script.js
function saveTokenCordova(token) {
  return new Promise((resolve, reject) => {
    const secureStore = new cordova.plugins.SecureStorage(
      () => {
        secureStore.set(
          () => resolve(), // ✅ Success
          (err) => reject('SecureStorage set error: ' + err), // ❌ Failure
          'auth_token',
          token
        );
      },
      (err) => reject('SecureStorage init error: ' + err), // ❌ Init failed
      'MangaBoxSecure'
    );
  });
}
/*
function saveTokenCordova(token) {
	secureStore.set(
		() => debugPrint('Token saved securely\n'),
		(err) => debugPrint('Failed to save token: ' + err + "\n"),
		'auth_token',
		token
	);
}
*/
function loadTokenCordova(token) {
	// Read token later
	secureStore.get(
		(value) => {
			debugPrintLn('Loaded token: ' + value);
			useToken(value);
		},
		(err) => debugPrintLn('Token read failed: ' + err),
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
	loginBaseUrl.value = mb.baseUrl;

	if (isElectronApp) {
		mb.authToken = await loadTokenElectron();
	} else if (isCordova) {
		mb.authToken = localStorage.getItem('mbAuthToken');
	} else {
		mb.authToken = true;
	}

	debugPrintLn("*** Loaded auth token");
	debugPrintLn("*** " + mb.authToken );
	debugPrintLn("");


	// Check for missing credentials
	if (!mb.baseUrl || !mb.authToken) {
		showLoginDialog();
		return;
	}

	// Setup fetch or HTTP call
	if (isCordova) {
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
				if (response.status >= 200 && response.status < 300) {
					hideLoginDialog();
					bootSequence();
				} else {
					showLoginDialog();
				}
			},
			function (error) {
				showLoginDialog();
			}
		);
	} else {
		// Web / Electron fetch
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

			if (responseOk && token) {
				localStorage.setItem('mbBaseUrl', baseUrlVal);

				saveTokenCordova(token).then(() => {
					hideLoginDialog();
					location.reload(true);
				}).catch((e) => {
					localStorage.setItem('mbAuthToken', token); // fallback (not secure)
					hideLoginDialog();
					location.reload(true);
				});
			}

		},
		function (error) {

		}
	);

}

function showLoginDialog() {
	loginScreen.classList.remove('auth-hidden');
}

function hideLoginDialog() {
	loginScreen.classList.add('auth-hidden');
}
