// script.js

async function checkCredentialsCap() {
	debugPrint('check Credentials Capacitor')
	const creds = await Capacitor.Plugins.SecureStoragePlugin.keys()
	try {
		debugPrint(JSON.stringify(creds));
	} catch (err) { debugPrint('error in keys') }

	const value = creds.value;

	if (!value || value.length === 0) {
		return null;
	}
	if (value.length > 1) {
		await Capacitor.Plugins.SecureStoragePlugin.clear()
		console.warn('Multiple credentials found, cleaned');
	}
	return value[0];
}

async function setCredentialsCap(serverId, password) {
	debugPrint("Saving Credentials:" + serverId + " " + password)

	try {
		const result = await Capacitor.Plugins.SecureStoragePlugin.set({
			key: serverId,
			value: password
		});

		debugPrint(`SecureStorage set result: ${result?.value === true ? 'OK' : 'FAILED'}`);
	} catch (err) {
		debugPrint(`SecureStorage error while saving credentials for ${serverId}`, err);
		throw err;
	}
}
async function deleteCredentialsCap(serverId) {
	debugPrint("Deleting Credentials:" + serverId)

	try {
		const result = await Capacitor.Plugins.SecureStoragePlugin.remove({
			key: serverId
		});

		debugPrint(`SecureStorage del result: ${result?.value === true ? 'OK' : 'FAILED'}`);
	} catch (err) {
		debugPrint(`SecureStorage error while deleting credentials for ${serverId}`, err);
		throw err;
	}
}

async function getCredentialsCap(serverId) {
	let result = null;
	try {
		result = await Capacitor.Plugins.SecureStoragePlugin.get({
			key: serverId
		});
		debugPrint(JSON.stringify(result));
		debugPrint(`SecureStorage get result: ${result?.value === true ? 'OK' : 'FAILED'}`);
	} catch (err) {
		debugPrint(`SecureStorage error while loading credentials for ${serverId}`, err);
		throw err;
	}
	if (!result) return null;

	return result.value;
}

//This is an old orphane function!
async function checkSavedUser() {
	let user = 'cookie'
	if (isWeb) {
		//NO action
	}
	if (isElectron) {
		user = await window.secureStore.checkCredentials2()
	}
	if (isCapacitor) {
		user = await checkCredentialsCap();
	}
	return user;
}

async function saveUserPass(serverId, pass) {
	if (isWeb && webPWD) {
		localStorage.setItem(serverId, pass);
		return
	}
	if (isElectron) {
		await window.secureStore.setCredentials2(serverId, pass);
	}
	if (isCapacitor) {
		await setCredentialsCap(serverId, pass);
	}
}

async function loadUserPass(serverId) {
	let pass = '';
	if (isWeb && webPWD) {
		pass = localStorage.getItem(serverId) || '';
	}
	if (isElectron) {
		pass = await window.secureStore.getCredentials2(serverId);
	}
	if (isCapacitor) {
		pass = await getCredentialsCap(serverId);
	}

	if (pass) {
		return (pass);
	} else {
		return ('');
	}
}

async function deleteUserPass(serverId) {
	if (isWeb && webPWD) {
		localStorage.removeItem(serverId);
		return
	}
	if (isElectron) {
		await window.secureStore.deleteCredentials2(serverId);
	}
	if (isCapacitor) {
		await deleteCredentialsCap(serverId)
	}
}

async function sessionCheck() {
	await executeFaderGradient(1);

	debugPrint("sessionCheck...");

	// At session start load current server and current user Id
	mb.currentServerId = localStorage.getItem('mb00CurrentServerId') || false;

	mb.currentUserId = localStorage.getItem('mb00CurrentUserId') || false;
	mb.baseUrl = localStorage.getItem('mb00BaseUrl') || '';
	mb.baseUrl = cleanBaseUrlVal(mb.baseUrl)

	debugPrint("Logged Server:" + mb.currentServerId)

	// --- 1. Missing credentials → login
	if ((!mb.baseUrl) || (!mb.currentServerId) || (!mb.currentUserId)) {
		debugPrint("Missing base URL or login data");
		showLogoDialog();
		await executeFaderGradient(0);
		return;
	}

	// --- 2. Connectivity check (optional for immediate offline mode)
	const sessionWasValid = localStorage.getItem("mb00SessionValid") === "true";
	let offline = !navigator.onLine;

	if (offline) {
		debugPrint("Offline mode detected.");
		if (sessionWasValid) {
			hideLogoDialog();
			bootSequence('offline');
		} else {
			showLogoDialog();
			await executeFaderGradient(0);
		}
		return;
	}

	// --- 3. Try validating the login
	let fetchPayload
	if (!isWeb || (isWeb && webPWD)) {
		const username = mb.serverList[mb.currentServerId].username;
		const password = await loadUserPass(mb.currentServerId);

		fetchPayload = {
			method: 'GET',
			headers: {
				'Authorization': 'Basic ' + btoa(`${username}:${password}`),
				'X-Requested-With': 'XMLHttpRequest',
				'skip_zrok_interstitial': '1'
			}
		}
	} else {
		fetchPayload = {
			method: 'GET',
			credentials: 'include',
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'skip_zrok_interstitial': '1'
			}
		}
	}

	try {
		const response = await fetch(`${mb.baseUrl}/api/v2/users/me`, fetchPayload);

		//TODO Magari usare callAPI invece?
		const rawBody = await response.text();
		let parsed = null;
		try {
			parsed = JSON.parse(rawBody);
		} catch (e) {
			console.warn(`BODY IS NOT JSON`);
		}

		if (response.ok) {
			if (isWeb && !webPWD) await fetch(`${mb.baseUrl}/api/v1/login/set-cookie`, fetchPayload);
			debugPrint("Session valid (server confirmed).");
			localStorage.setItem("mb00SessionValid", "true");
			hideLogoDialog();
			bootSequence('online');

		} else if (response.status === 401 || response.status === 403) {
			debugPrint("Credentials invalid or expired.");
			mb.currentUserId = false;

			//TODO Verifica se questa funzione fa già più di quel che fa il resto
			await logOutFromCurrentServer()

			localStorage.removeItem("mb00SessionValid");
			showLogoDialog();
			await executeFaderGradient(0);

		} else {
			debugPrint(`Unexpected server response (${response.status}) — assuming temporary issue.`);
			if (sessionWasValid) {
				hideLogoDialog();
				bootSequence('offline');
				await executeFaderGradient(0);

			} else {
				showLogoDialog();
				await executeFaderGradient(0);
			}
		}
	} catch (error) {
		debugPrint("Session check failed: " + error);
		debugPrint("Treating as temporary network/server issue.");

		if (sessionWasValid) {
			hideLogoDialog();
			bootSequence('offline');
			await executeFaderGradient(0);

		} else {
			showLogoDialog();
			await executeFaderGradient(0);

		}
	}
}

async function systemRestart() {
	//TODO: This works and is quite good but it would be better to implement a navigateTo "login" for the login screen
	//TODO: and externalise the functions that are hear in a function that is called at boot or at login screen show
	console.log("SYSRESTART")
	// Reapply boot theme

	//XXX Added recently, maybe can override others?
	closeModal();

	await executeFaderGradient(1);
	let toDark = mbPrefersDarkMode.matches ? true : false
	document.documentElement.setAttribute('data-theme', toDark ? 'dark' : 'light');

	logoScreen.classList = "logo-hidden logo-pattern";


	errorBox.textContent = '';
	errorBox.classList.toggle('logo-hidden', true);
	executeFade(1);

	if (isSystemBars) {
		if (isSharpCornerIphone) {
			Capacitor.Plugins.SystemBars.hide();
		} else {
			Capacitor.Plugins.SystemBars.show();
		}
	}

	//TODO Mettere qui distruzione library menu
	librariesList.innerHTML = '';
	extraButtons.innerHTML = '';

	//TODO Qui va ridefinizione di mb
	clearLibrariesMenus();

	mb = initMB();

	applyLanguage();

	mb.filterTable = initFilterTable();

	mb.filterButtons = [
		mb.filterTable.sorting,
		mb.filterTable.filter_by_read,
		mb.filterTable.filter_by_direction,
		mb.filterTable.filter_by_language
	];

	buildFilters();
	//TODO Qui va ridefinizione di rd


	document.querySelectorAll('.section').forEach(section => sectionHide(section));
	document.querySelectorAll('.collector').forEach(item => item.remove());

	//In part useless because of the click outside events, but useful when loading an url
	sectionHide(filtersBar);
	sectionHide(colorSwatchBar);
	sectionHide(stickyContainer);

	mb.libMenuVisible = null;
	mb.swatchMenuVisible = false
	await updateSizer([])

	updateStickyMenu();


	offlineSession = false;
	document.documentElement.style.setProperty('--mb-h', '348');
	document.documentElement.style.setProperty('--mb-s', '92%');
	document.documentElement.style.setProperty('--mb-l', '38%');

	document.documentElement.style.setProperty('--mb-gradient-1', '30');
	document.documentElement.style.setProperty('--mb-gradient-2', '40');

	sessionCheck();
}

//TODO ZZZZZZZZ Ecco l'idea:
/*
logintoserver è triggerato SOLO dal menu, e a questo punto faccio un TEST di login forzato per poi lanciare di nuovo il login SENZA TEST
*/
async function loginToServer(event, serverId, test) {
	console.log("CURRENT SERVER ID: " + mb.currentServerId)
	console.log("LOGIN TO SERVER: " + serverId)
	console.log("LOGIN WITH USER: " + mb.serverList[serverId].userId)
	console.log("LOGIN WITH URL: " + mb.serverList[serverId].url)
	// loggingServerId is the TEMPORARY server you are trying to log in

	mb.loggingServerId = serverId;

	event.stopPropagation();

	if (mb.serverList[serverId].askPassword || (isWeb && !webPWD)) {
		// In askPassword mode it shows the password requester
		serverPasswordDialog(mb.loggingServerId, mb.serverList[mb.loggingServerId])
	} else {

		mb.currentServerId = serverId;

		mb.currentUserId = mb.serverList[serverId].userId;

		localStorage.setItem('mb00CurrentServerId', mb.currentServerId);
		localStorage.setItem('mb00CurrentUserId', mb.currentUserId);
		localStorage.setItem('mb00BaseUrl', mb.serverList[mb.currentServerId].url)

		history.pushState(null, '', mb.basePath + '#dashboard');

		if (mb.currentUserId == false) {
			// There is no currently logged in user on any server so it can just do the login
			login(serverId, test, false);
		} else {
			systemRestart();
		}
	}
	return
}

function cleanBaseUrlVal(baseUrlVal) {
	if (!/^https?:\/\//i.test(baseUrlVal)) {
		baseUrlVal = 'https://' + baseUrlVal;
	}
	baseUrlVal = baseUrlVal.replace(/\/$/, '');

	return baseUrlVal
}

async function login(serverId, test, fromDialog) {

	// Hide login error messages
	errorBox.classList.toggle('logo-hidden', true);

	// The "fromDialog" flag is true if the password value is entered in the server edit screen 
	// (and test is true) or in the password requester (and test is false)
	let baseUrlVal = test ? loginBaseUrl.value : mb.serverList[serverId].url;
	let usernameVal = test ? loginUsername.value : mb.serverList[serverId].username;
	let passwordVal = (test || fromDialog) ? loginPassword.value : await loadUserPass(serverId);

	// Cleanup the base URL value to ensure it has the correct format
	baseUrlVal = cleanBaseUrlVal(baseUrlVal);

	// Build the basic authentication header using the provided username and password
	let mbAuthHeader = 'Basic ' + btoa(`${usernameVal}:${passwordVal}`);

	//XXX This is not used???
	let fetchString = (isWeb && !webPWD)
		? `${baseUrlVal}/api/v1/login/set-cookie?remember-me=true`
		: `${baseUrlVal}/api/v2/users/me`;

	//fetches user data to check if the credentials are valid and to retrieve the user ID
	fetch(`${baseUrlVal}/api/v2/users/me`, {
		method: 'GET',
		credentials: 'include',
		headers: {
			'Authorization': mbAuthHeader,
			'X-Requested-With': 'XMLHttpRequest',
			'skip_zrok_interstitial': '1'
		}
	}).then(async response => {
		debugPrint(JSON.stringify(response))
		if (response.ok) {
			debugPrint("response.ok")
			// If the response is successful, parse the response body as JSON to retrieve user data
			const rawBody = await response.text();
			let parsed = null;

			try {
				parsed = JSON.parse(rawBody);
			} catch (e) {
				console.warn(`BODY IS NOT JSON`);
			}

			//If we are not in test mode procede to the actual login code
			//XXX This is parsed even if JSON parsing fails, which could lead to issues. Consider adding error handling for JSON parsing.
			if (!test) {
				await executeFaderGradient(1);

				await closeModal();
				localStorage.setItem('mb00BaseUrl', baseUrlVal);

				mb.currentServerId = serverId;
				mb.currentUserId = parsed.id;

				localStorage.setItem('mb00CurrentServerId', mb.currentServerId);
				localStorage.setItem('mb00CurrentUserId', mb.currentUserId);
				localStorage.setItem('mb00BaseUrl', mb.serverList[mb.currentServerId].url)

				mb.serverList[serverId].userId = mb.currentUserId;
				mb.serverList[serverId].askPassword = false;

				localStorage.setItem('mb00ServerList', JSON.stringify(mb.serverList));


				// If it's a web login and the password is not saved, we need to set the cookie for the session
				if (isWeb && !webPWD) await fetch(`${baseUrlVal}/api/v1/login/set-cookie`, {
					method: 'GET',
					credentials: 'include',
					headers: {
						'X-Requested-With': 'XMLHttpRequest',
						'skip_zrok_interstitial': '1'
					}
				});

				console.log("LOG-SYSTEM RESTART")
				systemRestart();
			} else {
				errorBox2.textContent = t("modal.ok");
				errorBox2.classList.toggle('logo-hidden', false);
				// We are in test mode, so we just show a modal indicating that the connection is OK
				//showModal('', false, t('server.connectionok'), [{ label: 'modal.ok', runfunction: () => closeModal(), high: true }]);
			}
		} else if (response.status === 401) {
			debugPrint("NOT response.ok, status 401")
			errorBox2.textContent = t(`server.invalidlogindata`);
			errorBox2.classList.toggle('logo-hidden', false);
		} else {
			debugPrint("NOT response.ok, NOT status 401")
			errorBox2.textContent = t(`server.loginfailed`);
			errorBox2.classList.toggle('logo-hidden', false);
		}
	}).catch(error => {
		//TODO Check and fix this
		debugPrint("fetch ERROR")

		localStorage.removeItem('mb00BaseUrl');
		localStorage.removeItem('mb00CurrentServerId');
		localStorage.removeItem('mb00CurrentUserId');

		mb.currentServerId = false;
		console.error('Login error:', error);
		errorBox2.textContent = t("server.cannotreach") + `${error}`;
		errorBox2.classList.toggle('logo-hidden', false);

	});

	// Reset login credentials if this is not a "test" login attempt
	if (!test) {
		loginPassword.value = null;
		mbAuthHeader = null;
	}
}

function showLogoDialog() {
	dragbar.classList.toggle('onLogin', true);
	debugPrint("show Login Dialog...")
	logoScreen.classList.toggle('logo-hidden', false);
}

function hideLogoDialog() {
	dragbar.classList.toggle('onLogin', false);
	debugPrint("hide Login Dialog...")
	logoScreen.classList.toggle('logo-hidden', true);
}

function isLogoScreenHidden() {
	return (logoScreen.classList.contains('logo-hidden'));
}
