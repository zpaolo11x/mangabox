// script.js
//TODO ALLO STATO ATTUALE NON FUNZIONA IL LOGOUT!

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

//TODO NON USATA DA NESSUNA PARTE!
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
	if (isWeb) {
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
	if (isWeb) {
		console.log(serverId)
		pass = localStorage.getItem(serverId) || '';
	}
	if (isElectron) {
		pass = await window.secureStore.getCredentials2(serverId);
	}
	if (isCapacitor) {
		pass = await getCredentialsCap(serverId);
	}

	console.log(pass)
	if (pass) {
		console.log('PASS OK: ' + pass)
		return (pass);
	} else {
		console.log('PASS EMPTY')
		return ('');
	}
}

async function deleteUserPass(serverId) {
	if (isWeb) {
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

async function saveToken(token) {
	debugPrint("saveToken...")
	console.log("saveToken...")
	await window.secureStore.setCredentials('auth', token);
}

async function loadToken() {
	debugPrint("loadToken...")
	console.log("loadToken...")
	const token = await window.secureStore.getCredentials('auth');
	debugPrint("Retrieved Token:" + token);
	console.log("Retrieved Token:" + token);
	if (token) {
		return (token);
	} else {
		return (false);
	}
}

async function deleteToken() {
	debugPrint("deleteToken...")
	console.log("deleteToken...")

	await window.secureStore.deleteCredentials('auth');
}

async function sessionCheck() {
	await executeFaderGradient(1);

	debugPrint("sessionCheck...");
	console.log("sessionCheck...");

	loginBaseUrl.value = mb.baseUrl;

	// Load stored token (e.g. from Electron storage)
	mb.currentServerId = localStorage.getItem('mbCurrentServerId') || false;

	console.log("Z - loggedServer:" + mb.currentServerId)
	debugPrint("Z - loggedServer:" + mb.currentServerId)

	// --- 1. Missing credentials → login
	if ((!mb.baseUrl) || (!mb.currentServerId)) {
		debugPrint("Missing base URL or auth token");
		showLoginDialog('firstboot', 0);
		await executeFaderGradient(0);
		return;
	}

	// --- 2. Connectivity check (optional for immediate offline mode)
	const sessionWasValid = localStorage.getItem("sessionValid") === "true";
	let offline = !navigator.onLine;

	if (offline) {
		debugPrint("Offline mode detected.");
		console.log("Offline mode detected.")
		if (sessionWasValid) {
			hideLoginDialog();
			bootSequence('offline');
		} else {
			showLoginDialog('firstboot', 0);
			await executeFaderGradient(0);
		}
		return;
	}

	// --- 3. Try validating the token
	let fetchPayload
	if (!isWeb || isWeb) {
		console.log("X-A")
		const username = mb.serverList[mb.currentServerId].username;
		const password = await loadUserPass(mb.currentServerId);
		console.log("LOGGING IN: "+username+" "+password);
		fetchPayload = {
			method: 'GET',
			headers: {
				'Authorization': 'Basic ' + btoa(`${username}:${password}`),
				'X-Requested-With': 'XMLHttpRequest',
				'skip_zrok_interstitial': '1'
			}
		}
	} else {
		console.log("X-B")
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

		if (response.ok) {
			debugPrint("Session valid (server confirmed).");
			console.log("Session valid (server confirmed).");
			localStorage.setItem("sessionValid", "true");
			hideLoginDialog();
			bootSequence('online');

		} else if (response.status === 401 || response.status === 403) {
			debugPrint("Token invalid or expired.");
			console.log("Token invalid or expired.");
			localStorage.removeItem("sessionValid");
			showLoginDialog('firstboot', 0);
			await executeFaderGradient(0);

		} else {
			debugPrint(`Unexpected server response (${response.status}) — assuming temporary issue.`);
			console.log(`Unexpected server response (${response.status}) — assuming temporary issue.`);
			if (sessionWasValid) {
				hideLoginDialog();
				bootSequence('offline');
				await executeFaderGradient(0);

			} else {
				showLoginDialog('firstboot', 0);
				await executeFaderGradient(0);
			}
		}
	} catch (error) {
		debugPrint("Session check failed: " + error);
		debugPrint("Treating as temporary network/server issue.");
		console.log("Session check failed: " + error);
		console.log("Treating as temporary network/server issue.");

		if (sessionWasValid) {
			hideLoginDialog();
			bootSequence('offline');
			await executeFaderGradient(0);

		} else {
			showLoginDialog('firstboot', 0);
			await executeFaderGradient(0);

		}
	}
}

async function setServerFields(serverId) {
	console.log("SET FIELDS")
	console.log(serverId)
	console.log(mb.serverList[serverId].name)
	loginServerName.value = (serverId == 0) ? t(mb.serverList[serverId].name) : mb.serverList[serverId].name;
	loginBaseUrl.value = mb.serverList[serverId].url;
	loginUsername.value = mb.serverList[serverId].username;
	if (serverId == 0 || mb.serverList[serverId].askPassword) {
		loginPassword.value = ''
	} else {
		let localPass = await loadUserPass(serverId);
		console.log("LOCALPASS")
		console.log(localPass)
		loginPassword.value = localPass;
		//TODO Eliminare la variabile ora
	}
}

async function systemRestart() {
	//TODO: This works and is quite good but it would be better to implement a navigateTo "login" for the login screen
	//TODO: and externalise the functions that are hear in a function that is called at boot or at login screen show

	// Reapply boot theme
	await executeFaderGradient(1);
	let toDark = mbPrefersDarkMode.matches ? true : false
	document.documentElement.setAttribute('data-theme', toDark ? 'dark' : 'light');

	loginScreen.classList = "auth-hidden logo-pattern";
	// Clear login dialog content

	setServerFields(0)

	loginError.textContent = '';
	loginError.classList.toggle('auth-hidden', true);	
	executeFade(1);

	if (isStatusBar) {
		if (isSharpCornerIphone) {
			Capacitor.Plugins.StatusBar.hide();
		} else {
			Capacitor.Plugins.StatusBar.show();
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

async function loginToServer(event, serverId, test) {

	mb.loggingServerId = serverId;

	event.stopPropagation();

	if (mb.serverList[serverId].askPassword) {
		showLoginDialog('enterpassword', mb.loggingServerId);
		closeModal();
	} else {
		mb.currentServerId = serverId;
		closeModal();
		login(serverId, test, false);
	}

	return
	if (mb.serverList[serverId].askPassword) {
		showLoginDialog('firstboot', serverId)
	} else {
		login(serverId, test, false)
	}
}

async function login(serverId, test, fromDialog) {

	if (serverId == 0){
		mb.serverList[0].url = loginBaseUrl.value;
		mb.serverList[0].username = loginUsername.value;
	}

	console.log("LOGGING:" + serverId);

	debugPrint("login...")
	console.log("login...")

	loginError.classList.toggle('auth-hidden', true);

	let baseUrlVal = fromDialog ? loginBaseUrl.value : mb.serverList[serverId].url;
	let usernameVal = fromDialog ? loginUsername.value : mb.serverList[serverId].username;
	let passwordVal = fromDialog ? loginPassword.value : await loadUserPass(serverId);

	console.log(baseUrlVal)
	console.log(usernameVal)
	console.log(passwordVal)

	if (!/^https?:\/\//i.test(baseUrlVal)) {
		baseUrlVal = 'https://' + baseUrlVal;
	}
	baseUrlVal = baseUrlVal.replace(/\/$/, '');

	//TODO Questo funziona per i test con server 0 e per gli edit quando i valori del server da modificare si portano
	// in editserver e quindi sono già nei field. Funziona anche con l'enter della password perché i field sono popolati
	// Ma funzionerò quando la password è automatica, e non voglio passare per i field???

	let mbAuthHeader = 'Basic ' + btoa(`${usernameVal}:${passwordVal}`);

	fetch(test
		? `${baseUrlVal}/api/v2/users/me`
		: `${baseUrlVal}/api/v2/users/me`, {
		method: 'GET',
		credentials: 'include',
		headers: {
			'Authorization': mbAuthHeader,
			'X-Requested-With': 'XMLHttpRequest',
			'X-Auth-Token': '',
			'skip_zrok_interstitial': '1'
		}
	}).then(async response => {
		const token = response.headers.get('X-Auth-Token');

		if (response.ok && token) {
			console.log("LOG-A")
			if (!test) {
				await executeFaderGradient(1);
				localStorage.setItem('mbBaseUrl', baseUrlVal);
				mb.currentServerId = serverId
				localStorage.setItem('mbCurrentServerId', mb.currentServerId);
				mb.serverList[serverId].askPassword = false;
				localStorage.setItem('mbServerList', JSON.stringify(mb.serverList));
				
				//TODO Magari resettare la password quando anche user 0 fa logout?
				if (serverId == 0) saveUserPass(serverId, passwordVal)
				//TODO COSA FARE??? await saveUserPass(loginUsername.value, loginPassword.value);
				console.log("LOG-SYSTEM RESTART")
				systemRestart();
			} else {
				showModal('', false, 'Sever Connection OK', [{ label: 'modal.ok', runfunction: () => closeModal(), high: true }]);
			}
		} else if (response.status === 401) {
				console.log("LOG-B")
		loginError.textContent = `Invalid username or password.`;
			loginError.classList.toggle('auth-hidden', false);
		} else {
				console.log("LOG-C")
		loginError.textContent = `Login failed`;
			loginError.classList.toggle('auth-hidden', false);
		}
	}).catch(error => {
		console.error('Login error:', error);
		loginError.textContent = `Cannot reach server. Check the address or your connection. ${error}`;
		loginError.classList.toggle('auth-hidden', false);
	});

	// Reset login credentials
	if (!test) {
		loginPassword.value = null;
		mbAuthHeader = null;
	}
}

function applyScenario(modeName, serverId) {
	const buttonsEnable = new Set(mb.loginModes[modeName].buttons || []);
	document.querySelectorAll(".action").forEach(btn => {
		btn.style.display = !buttonsEnable.has(btn.id) ? 'none' : '';
	});

	const inputsEnable = new Set(mb.loginModes[modeName].inputs || []);
	document.querySelectorAll(".input-wrapper").forEach(inp => {
		inp.classList.toggle('disabled-input', !inputsEnable.has(inp.id));
	});

	if (modeName == 'firstboot') {
		mb.editServerId = 0;
		mb.editServerData = mb.serverList[0];
	}

	setServerFields(serverId);
}

function showLoginDialog(dialogMode, serverId) {

	mb.loginMode = dialogMode;

	//dialogMode = 'firstboot'
	loginError.textContent = '';
	loginError.classList.toggle('auth-hidden', true);
	
	applyScenario(dialogMode, serverId)

	loginPassword.type = 'password';
	viewPassword.classList.toggle('fa-eye', true);
	viewPassword.classList.toggle('fa-eye-slash', false);

	dragbar.classList.add('onLogin');
	debugPrint("showLoginDialog...")
	console.log("showLoginDialog...")
	loginScreen.classList.toggle('auth-hidden', false);
}

function hideLoginDialog() {
	mb.loginMode = '';

	dragbar.classList.remove('onLogin');
	debugPrint("hideLoginDialog...")
	console.log("hideLoginDialog...")
	loginScreen.classList.toggle('auth-hidden', true);
}

function isLoginScreenHidden() {
	return (loginScreen.classList.contains('auth-hidden'));
}
