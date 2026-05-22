const display = document.getElementById('time-display');
const modeLabel = document.getElementById('mode-label');
const startPauseButton = document.getElementById('start-pause-btn');
const resetButton = document.getElementById('reset-btn');
const settingsForm = document.getElementById('settings-form');
const focusMinutesInput = document.getElementById('focus-minutes');
const breakMinutesInput = document.getElementById('break-minutes');
const historyList = document.getElementById('history-list');

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
	const item = document.createElement('li');
	const label = mode === 'focus' ? 'Focus complete' : 'Break complete';
	item.textContent = `${label} - ${formatTime(durationMs)}`;
	historyList.prepend(item);
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
}

function switchMode() {
	state.mode = state.mode === 'focus' ? 'break' : 'focus';
	state.remainingMs = currentDurationMs();
	updateModeLabel();
	updateDisplay(state.remainingMs);
}

function handlePhaseComplete() {
	const completedMode = state.mode;
	const completedDuration = currentDurationMs();
	addHistoryEntry(completedMode, completedDuration);
	switchMode();

	if (state.isRunning) {
		state.endTimestamp = Date.now() + state.remainingMs;
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
}

function applySettings(event) {
	event.preventDefault();

	state.settings.focusMinutes = clampPositiveInteger(focusMinutesInput.value, state.settings.focusMinutes);
	state.settings.breakMinutes = clampPositiveInteger(breakMinutesInput.value, state.settings.breakMinutes);

	focusMinutesInput.value = String(state.settings.focusMinutes);
	breakMinutesInput.value = String(state.settings.breakMinutes);

	if (!state.isRunning && state.mode === 'focus') {
		state.remainingMs = state.settings.focusMinutes * 60 * 1000;
		updateDisplay(state.remainingMs);
	}

	if (!state.isRunning && state.mode === 'break') {
		state.remainingMs = state.settings.breakMinutes * 60 * 1000;
		updateDisplay(state.remainingMs);
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

updateModeLabel();
updateDisplay(state.remainingMs);
 
