# Pomodoro Timer

A polished single-screen Pomodoro web app built with vanilla HTML, CSS, and JavaScript. It includes configurable focus and break durations, persistent daily history, automatic cycle transitions, and a browser-tab countdown title.

## Features

- Focus and break timer with configurable durations
- Start, pause, resume, and reset controls
- Countdown display in `mm:ss`
- Automatic transition from focus to break and back
- Audible cue when a cycle completes
- Daily focus-session history with local persistence
- Browser tab countdown sync while the timer is running
- Responsive dark-mode UI with a circular timer layout

## How It Works

The app uses the browser clock to keep the countdown accurate across refreshes and tab switches. Timer state, history, and settings are stored in `localStorage`, and the history resets automatically when a new calendar day starts.

Focus session entries are saved in the following format:

`✓ 25:00 focus — 3:42pm`

If a task is entered, the log includes it as well:

`✓ 25:00 focus [Write README] — 3:42pm`

## Project Structure

- `index.html` - app structure and UI layout
- `styles.css` - dark-mode theme, responsive layout, and visual polish
- `app.js` - timer engine, persistence, history, and audio cue logic

## Usage

1. Open `index.html` in a browser.
2. Set your focus and break minutes if you want to customize the default `25 / 5` cycle.
3. Enter an optional task name.
4. Click `Start` to begin the session.
5. When a session ends, the app logs it automatically and switches modes.

## Storage

The app stores the following in `localStorage`:

- `settings` - focus and break durations
- `timerState` - current mode, running state, and remaining time
- `history` - completed focus sessions for the current day
- `lastActiveDate` - used to detect a new calendar day and reset history

## Notes

- The countdown title is updated in the browser tab while the timer runs.
- Audio playback may require a user interaction before the first sound can play, depending on the browser.
- The layout is responsive and intended to remain usable on small screens.

 
