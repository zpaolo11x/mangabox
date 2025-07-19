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

	debugPrint("SESSION CHECK")

	mb.authToken = true;
	if (isElectronApp) mb.authToken = await loadToken();
	if (isCapacitor) mb.authToken = localStorage.getItem("mbAuthToken");


	debugPrint("CURRENT TOKEN:\n" + mb.authToken);

	if ((!mb.baseUrl) || (!mb.authToken)) {
		showLoginDialog();
		return;
	}

	if (isCapacitor) {

		try {
			const response = await CapacitorHTTP.request({
				method: 'GET',
				url: `${mb.baseUrl}/api/v1/login/set-cookie`,
				headers: {
					'Authorization': mbAuthHeader,
					'X-Requested-With': 'XMLHttpRequest',
					'X-Auth-Token': mb.authToken,
					'skip_zrok_interstitial': '1'
				},
				params: {}

			});
			debugPrint("RESPONSE CHECK: "+response.status)
			if (response.status >= 200 && response.status < 300) {
				hideLoginDialog();
				bootSequence();
			} else {
				showLoginDialog();
			}
		} catch (error) {
			showLoginDialog();
		}

	} else {
		let fetchPayload = isElectronApp
		?	{
				method: 'GET',
				headers: {
					'X-Auth-Token': mb.authToken,
					'X-Requested-With': 'XMLHttpRequest',
					'skip_zrok_interstitial': '1'
				}
			}
		:	{
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

async function login() {
	let baseUrlVal = loginBaseUrl.value;

	baseUrlVal = "https://aerobox.freeddns.it/komga"; //XXX

	if (!/^https?:\/\//i.test(baseUrlVal)) {
		baseUrlVal = 'https://' + baseUrlVal;
	}
	baseUrlVal = baseUrlVal.replace(/\/$/, '');

	let mbAuthHeader = 'Basic ' + btoa(`${loginUsername.value}:${loginPassword.value}`);

	mbAuthHeader = 'Basic ' + btoa(`testuser@test.com:test`); //XXX

	if (isCapacitor) {
		debugPrint("CAPACITOR SESSION")
		// Use Capacitor native HTTP
		try {
			const url = `${baseUrlVal}/api/v1/login/set-cookie${loginRememberMe.checked ? '?remember-me=true' : ''}`;
			debugPrint("CapacitorHTTP: \n" + JSON.stringify(CapacitorHTTP));
			debugPrint("url:" + url);
			debugPrint("authHeader: " + mbAuthHeader);

			const response = await CapacitorHTTP.request({
				method: 'GET',
				url: url,
				headers: {
					'Authorization': mbAuthHeader,
					'X-Requested-With': 'XMLHttpRequest',
					'X-Auth-Token': '',
					'skip_zrok_interstitial': '1'
				},
				params: {}
			});
			debugPrint("RESPONSE: " + response.status);
			// Capacitor Http.request returns status and headers differently:
			if (response.status >= 200 && response.status < 300) {
				// X-Auth-Token header might be lowercase or uppercase - check response.headers
				const token = response.headers['x-auth-token'] || response.headers['X-Auth-Token'];

				debugPrint("TOKEN: " + token);

				if (token) {
					localStorage.setItem('mbBaseUrl', baseUrlVal);
					localStorage.setItem('mbAuthToken', token);
					localStorage.setItem('mbRememberMe', loginRememberMe.checked ? '1' : '0');

					hideLoginDialog();
					location.reload(true);
					return;
				}
			}
			// If we reach here, show error
			localStorage.setItem('mbBaseUrl', baseUrlVal);
			loginError.classList.remove('auth-hidden');

		} catch (error) {
			debugPrint('Native HTTP login error: ' + error);
			loginError.classList.remove('auth-hidden');
		}
	} else {
		// Regular fetch for web / Electron
		fetch(`${baseUrlVal}/api/v1/login/set-cookie${loginRememberMe.checked ? '?remember-me=true' : ''}`, {
			method: 'GET',
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
						await saveToken(token);
					}
					hideLoginDialog();
					location.reload(true);
				} else {
					localStorage.setItem('mbBaseUrl', baseUrlVal);
					loginError.classList.remove('auth-hidden');
				}
			})
			.catch(error => {
				console.error('Login error:', error);
				loginError.classList.remove('auth-hidden');
			});
	}
}


function showLoginDialog() {
	loginScreen.classList.remove('auth-hidden');
}

function hideLoginDialog() {
	loginScreen.classList.add('auth-hidden');
}
