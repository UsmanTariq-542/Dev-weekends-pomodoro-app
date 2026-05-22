const display = document.getElementById('time-display');
const modeLabel = document.getElementById('mode-label');
const startPauseButton = document.getElementById('start-pause-btn');
const resetButton = document.getElementById('reset-btn');
const settingsForm = document.getElementById('settings-form');
const taskInput = document.getElementById('task-input');
const focusMinutesInput = document.getElementById('focus-minutes');
const breakMinutesInput = document.getElementById('break-minutes');
const historyList = document.getElementById('history-list');

const STORAGE_KEYS = {
	history: 'history',
	lastActiveDate: 'lastActiveDate',
	settings: 'settings',
	timerState: 'timerState',
};

let history = [];

const state = {
	mode: 'focus',
	isRunning: false,
	endTimestamp: null,
	remainingMs: 25 * 60 * 1000,
	settings: {
		focusMinutes: 25,
		breakMinutes: 5,
	},
};

let tickHandle = null;
let titleHandle = null;
let titleWorker = null;

function clampPositiveInteger(value, fallback) {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatTime(ms) {
	const safeMs = Math.max(0, ms);
	const totalSeconds = Math.ceil(safeMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatClockTime(date) {
	const hours24 = date.getHours();
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const suffix = hours24 >= 12 ? 'pm' : 'am';
	const hours12 = hours24 % 12 || 12;
	return `${hours12}:${minutes}${suffix}`;
}

function getTodayString() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function saveHistory() {
	localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
}

function saveSettings() {
	localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function saveTimerState() {
	localStorage.setItem(
		STORAGE_KEYS.timerState,
		JSON.stringify({
			mode: state.mode,
			isRunning: state.isRunning,
			remainingMs: state.remainingMs,
			endTimestamp: state.endTimestamp,
		}),
	);
}

function updateDocumentTitle() {
	if (state.isRunning && state.endTimestamp !== null) {
		const remaining = Math.max(0, state.endTimestamp - Date.now());
		document.title = `(${formatTime(remaining)}) Pomodoro`;
		return;
	}

	document.title = 'Pomodoro Timer';
}

function syncDocumentTitleFromClock() {
	updateDocumentTitle();
}

function clearTitleTicker() {
	if (titleHandle !== null) {
		clearTimeout(titleHandle);
		titleHandle = null;
	}

	if (titleWorker !== null) {
		titleWorker.terminate();
		titleWorker = null;
	}
}

function startTitleTicker() {
	clearTitleTicker();

	const workerSource = `
		let timerId = null;
		let endTimestamp = null;

		function formatTime(ms) {
			const safeMs = Math.max(0, ms);
			const totalSeconds = Math.ceil(safeMs / 1000);
			const minutes = Math.floor(totalSeconds / 60);
			const seconds = totalSeconds % 60;
			return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
		}

		function postTitle() {
			if (endTimestamp === null) {
				postMessage({ title: 'Pomodoro Timer', done: true });
				return;
			}

			const remaining = Math.max(0, endTimestamp - Date.now());
			if (remaining <= 0) {
				postMessage({ title: 'Pomodoro Timer', done: true });
				return;
			}

			postMessage({ title: '(' + formatTime(remaining) + ') Pomodoro', done: false });
		}

		function startTicker(nextEndTimestamp) {
			endTimestamp = nextEndTimestamp;
			if (timerId !== null) {
				clearInterval(timerId);
			}

			postTitle();
			timerId = setInterval(postTitle, 1000);
		}

		function stopTicker() {
			endTimestamp = null;
			if (timerId !== null) {
				clearInterval(timerId);
				timerId = null;
			}
			postMessage({ title: 'Pomodoro Timer', done: true });
		}

		onmessage = function (event) {
			const data = event.data || {};
			if (data.type === 'start') {
				startTicker(data.endTimestamp);
				return;
			}

			if (data.type === 'stop') {
				stopTicker();
			}
		};
	`;

	titleWorker = new Worker(URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' })));
	titleWorker.onmessage = (event) => {
		const data = event.data || {};
		if (typeof data.title === 'string') {
			document.title = data.title;
		}

		if (data.done) {
			clearTitleTicker();
		}
	};
	titleWorker.postMessage({ type: 'start', endTimestamp: state.endTimestamp });
}

function syncTimerFromEndTimestamp() {
	if (!state.isRunning || state.endTimestamp === null) {
		updateDocumentTitle();
		return;
	}

	state.remainingMs = Math.max(0, state.endTimestamp - Date.now());
	updateDisplay(state.remainingMs);
	updateDocumentTitle();

	if (state.remainingMs <= 0) {
		handlePhaseComplete();
	}
}

function persistState() {
	saveSettings();
	saveTimerState();
}

function parseStoredJson(key) {
	const rawValue = localStorage.getItem(key);
	if (!rawValue) {
		return null;
	}

	try {
		return JSON.parse(rawValue);
	} catch {
		return null;
	}
}

function renderHistory() {
	historyList.innerHTML = '';

	history.forEach((entry) => {
		const item = document.createElement('li');
		item.textContent = entry;
		historyList.appendChild(item);
	});
}

function resetHistoryForNewDay(todayString) {
	history = [];
	localStorage.removeItem(STORAGE_KEYS.history);
	localStorage.removeItem(STORAGE_KEYS.timerState);
	localStorage.setItem(STORAGE_KEYS.lastActiveDate, todayString);
	renderHistory();
}

function initializeApp() {
	const todayString = getTodayString();
	const lastActiveDate = localStorage.getItem(STORAGE_KEYS.lastActiveDate);
	const storedSettings = parseStoredJson(STORAGE_KEYS.settings);
	const storedTimerState = parseStoredJson(STORAGE_KEYS.timerState);

	if (storedSettings && typeof storedSettings === 'object') {
		state.settings.focusMinutes = clampPositiveInteger(storedSettings.focusMinutes, state.settings.focusMinutes);
		state.settings.breakMinutes = clampPositiveInteger(storedSettings.breakMinutes, state.settings.breakMinutes);
	}

	focusMinutesInput.value = String(state.settings.focusMinutes);
	breakMinutesInput.value = String(state.settings.breakMinutes);

	if (lastActiveDate !== todayString) {
		resetHistoryForNewDay(todayString);
	} else {
		const storedHistory = localStorage.getItem(STORAGE_KEYS.history);
		try {
			history = storedHistory ? JSON.parse(storedHistory) : [];
		} catch {
			history = [];
			saveHistory();
		}
		renderHistory();
	}

	if (storedTimerState && typeof storedTimerState === 'object') {
		state.mode = storedTimerState.mode === 'break' ? 'break' : 'focus';
		state.isRunning = Boolean(storedTimerState.isRunning);
		state.endTimestamp = Number.isFinite(storedTimerState.endTimestamp) ? storedTimerState.endTimestamp : null;
		state.remainingMs = Number.isFinite(storedTimerState.remainingMs)
			? Math.max(0, storedTimerState.remainingMs)
			: state.settings.focusMinutes * 60 * 1000;

		if (state.isRunning && state.endTimestamp !== null) {
			startPauseButton.textContent = 'Pause';
			updateModeLabel();
			syncTimerFromEndTimestamp();
			if (state.remainingMs > 0) {
				startTitleTicker();
				scheduleTick();
			} else {
				clearTitleTicker();
			}
		} else {
			startPauseButton.textContent = 'Start';
			updateModeLabel();
			updateDisplay(state.remainingMs);
			updateDocumentTitle();
			clearTitleTicker();
		}
	} else {
		state.mode = 'focus';
		state.isRunning = false;
		state.endTimestamp = null;
		state.remainingMs = state.settings.focusMinutes * 60 * 1000;
		startPauseButton.textContent = 'Start';
		updateModeLabel();
		updateDisplay(state.remainingMs);
		updateDocumentTitle();
		clearTitleTicker();
	}

	localStorage.setItem(STORAGE_KEYS.lastActiveDate, todayString);
	persistState();
}

function updateDisplay(ms) {
	display.textContent = formatTime(ms);
}

function updateModeLabel() {
	modeLabel.textContent = state.mode === 'focus' ? 'Focus' : 'Break';
}

function currentDurationMs() {
	const minutes = state.mode === 'focus' ? state.settings.focusMinutes : state.settings.breakMinutes;
	return minutes * 60 * 1000;
}

function addHistoryEntry(mode, durationMs) {
	if (mode !== 'focus') {
		return;
	}

	const taskName = taskInput.value.trim();
	const taskSegment = taskName ? ` [${taskName}]` : '';
	const entry = `✓ ${formatTime(durationMs)} focus${taskSegment} — ${formatClockTime(new Date())}`;
	history.unshift(entry);
	saveHistory();
	renderHistory();
	taskInput.value = '';
}

function clearTicker() {
	if (tickHandle !== null) {
		clearTimeout(tickHandle);
		tickHandle = null;
	}
}

function scheduleTick() {
	clearTicker();

	if (!state.isRunning) {
		return;
	}

	const now = Date.now();
	const remaining = state.endTimestamp - now;

	if (remaining <= 0) {
		updateDisplay(0);
		updateDocumentTitle();
		handlePhaseComplete();
		return;
	}

	updateDisplay(remaining);
	updateDocumentTitle();

	const driftCompensationDelay = Math.min(250, Math.max(50, remaining % 1000 || 1000));
	tickHandle = window.setTimeout(scheduleTick, driftCompensationDelay);
}

function handleVisibilityOrFocusChange() {
	if (document.hidden) {
		updateDocumentTitle();
		return;
	}

	syncTimerFromEndTimestamp();
	if (state.isRunning && state.endTimestamp !== null) {
		startTitleTicker();
	}
	if (state.isRunning && state.endTimestamp !== null && state.remainingMs > 0) {
		scheduleTick();
	}
}

function startTimer() {
	if (state.isRunning) {
		return;
	}

	state.isRunning = true;
	state.endTimestamp = Date.now() + state.remainingMs;
	startPauseButton.textContent = 'Pause';
	updateDocumentTitle();
	startTitleTicker();
	persistState();
	scheduleTick();
}

function pauseTimer() {
	if (!state.isRunning) {
		return;
	}

	state.remainingMs = Math.max(0, state.endTimestamp - Date.now());
	state.isRunning = false;
	state.endTimestamp = null;
	startPauseButton.textContent = 'Start';
	clearTicker();
	clearTitleTicker();
	updateDisplay(state.remainingMs);
	updateDocumentTitle();
	persistState();
}

function switchMode() {
	state.mode = state.mode === 'focus' ? 'break' : 'focus';
	state.remainingMs = currentDurationMs();
	updateModeLabel();
	updateDisplay(state.remainingMs);
	updateDocumentTitle();
	if (state.isRunning) {
		startTitleTicker();
	}
	persistState();
}

function handlePhaseComplete() {
	const completedMode = state.mode;
	const completedDuration = currentDurationMs();
	addHistoryEntry(completedMode, completedDuration);
	switchMode();

	if (state.isRunning) {
		state.endTimestamp = Date.now() + state.remainingMs;
		persistState();
		scheduleTick();
	}
}

function resetTimer() {
	clearTicker();
	state.isRunning = false;
	state.mode = 'focus';
	state.remainingMs = state.settings.focusMinutes * 60 * 1000;
	state.endTimestamp = null;
	startPauseButton.textContent = 'Start';
	clearTitleTicker();
	updateModeLabel();
	updateDisplay(state.remainingMs);
	updateDocumentTitle();
	persistState();
}

function applySettings(event) {
	event.preventDefault();

	state.settings.focusMinutes = clampPositiveInteger(focusMinutesInput.value, state.settings.focusMinutes);
	state.settings.breakMinutes = clampPositiveInteger(breakMinutesInput.value, state.settings.breakMinutes);

	focusMinutesInput.value = String(state.settings.focusMinutes);
	breakMinutesInput.value = String(state.settings.breakMinutes);
	persistState();

	if (!state.isRunning && state.mode === 'focus') {
		state.remainingMs = state.settings.focusMinutes * 60 * 1000;
		updateDisplay(state.remainingMs);
		updateDocumentTitle();
		persistState();
	}

	if (!state.isRunning && state.mode === 'break') {
		state.remainingMs = state.settings.breakMinutes * 60 * 1000;
		updateDisplay(state.remainingMs);
		updateDocumentTitle();
		persistState();
	}
}

startPauseButton.addEventListener('click', () => {
	if (state.isRunning) {
		pauseTimer();
	} else {
		startTimer();
	}
});

resetButton.addEventListener('click', resetTimer);
settingsForm.addEventListener('submit', applySettings);
document.addEventListener('visibilitychange', handleVisibilityOrFocusChange);
window.addEventListener('focus', handleVisibilityOrFocusChange);
window.addEventListener('pageshow', handleVisibilityOrFocusChange);

initializeApp();
 
