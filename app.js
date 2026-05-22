const display = document.getElementById('time-display');
const modeLabel = document.getElementById('mode-label');
const startPauseButton = document.getElementById('start-pause-btn');
const resetButton = document.getElementById('reset-btn');
const settingsForm = document.getElementById('settings-form');
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
			state.remainingMs = Math.max(0, state.endTimestamp - Date.now());
			if (state.remainingMs <= 0) {
				updateDisplay(0);
				handlePhaseComplete();
			} else {
				startPauseButton.textContent = 'Pause';
				updateModeLabel();
				updateDisplay(state.remainingMs);
				scheduleTick();
			}
		} else {
			startPauseButton.textContent = 'Start';
			updateModeLabel();
			updateDisplay(state.remainingMs);
		}
	} else {
		state.mode = 'focus';
		state.isRunning = false;
		state.endTimestamp = null;
		state.remainingMs = state.settings.focusMinutes * 60 * 1000;
		startPauseButton.textContent = 'Start';
		updateModeLabel();
		updateDisplay(state.remainingMs);
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

	const entry = `✓ ${formatTime(durationMs)} focus — ${formatClockTime(new Date())}`;
	history.unshift(entry);
	saveHistory();
	renderHistory();
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
		handlePhaseComplete();
		return;
	}

	updateDisplay(remaining);

	const driftCompensationDelay = Math.min(250, Math.max(50, remaining % 1000 || 1000));
	tickHandle = window.setTimeout(scheduleTick, driftCompensationDelay);
}

function startTimer() {
	if (state.isRunning) {
		return;
	}

	state.isRunning = true;
	state.endTimestamp = Date.now() + state.remainingMs;
	startPauseButton.textContent = 'Pause';
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
	updateDisplay(state.remainingMs);
	persistState();
}

function switchMode() {
	state.mode = state.mode === 'focus' ? 'break' : 'focus';
	state.remainingMs = currentDurationMs();
	updateModeLabel();
	updateDisplay(state.remainingMs);
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
	updateModeLabel();
	updateDisplay(state.remainingMs);
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
		persistState();
	}

	if (!state.isRunning && state.mode === 'break') {
		state.remainingMs = state.settings.breakMinutes * 60 * 1000;
		updateDisplay(state.remainingMs);
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

initializeApp();
 
