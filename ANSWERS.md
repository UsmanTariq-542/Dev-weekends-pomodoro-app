# Project Submission: Persistent Pomodoro Timer

## 1. How to run
This project is built with vanilla HTML, CSS, and JavaScript, so it runs directly in a browser without a build step.

### Local execution
1. Clone the repository or download the project files to your machine.
2. Open the root folder in a file explorer.
3. Double-click `index.html` to launch the app in your browser.
4. If you prefer a local server, you can also run:

```bash
npx serve .
```

### Live deployment
- Production URL: https://dev-weekends-pomodoro-app.vercel.app/
- GitHub repository: https://github.com/UsmanTariq-542/Dev-weekends-pomodoro-app

## 2. Stack and design choices
### Frontend stack
I chose a pure Vanilla HTML5, CSS3, and JavaScript (ES6+) stack. A Pomodoro timer works best when it stays lightweight and responsive, so using browser-native APIs such as `localStorage`, `Date.now()`, and timer callbacks keeps the app fast and simple without the overhead of a larger framework.

### Visual and interaction decisions
- Circular timer focus area (`.timer-circle`): The timer is centered inside a circular container to make the remaining time feel like the visual anchor of the page. The shape creates a calm, clock-like focus area and gives the app a more polished desktop-dashboard feel.
- Tabular numerals for countdowns: I used `font-variant-numeric: tabular-nums` on the main countdown and the history list so digits keep a fixed width while changing. That prevents layout shifting as the timer updates every second.
- Dark minimalist theme: The interface uses a deep slate background, high-contrast text, soft borders, and restrained amber accents so the timer stays readable and comfortable during long study sessions.

## 3. Responsive and accessibility
### Screen behavior
- 1440px laptop: The app sits in a centered card with balanced spacing, a prominent timer circle, and enough breathing room for the controls and history panel.
- 360px mobile phone: The layout collapses into a compact single-column view, the circle and typography scale down, and the buttons and form fields stack so the interface remains usable on small screens.

### Accessibility handled
- Color contrast and readability: The design keeps strong contrast between the background and text so the app stays legible in low-light conditions.
- Clear visual state: The interface shows whether the timer is focused, on break, or paused through the mode label, button states, and countdown display.
- Keyboard-friendly controls: The app uses standard form controls and buttons, so it remains easy to operate without custom interaction patterns.

### Accessibility tradeoff
I did not make the countdown announce every second through an assertive live region. Calling out every tick would be noisy and distracting for screen-reader users, so I kept the announcements restrained and focused on the important state changes instead.

## 4. AI usage
### Tools and assistance used
GitHub Copilot and Gemini AI were used to help draft layout ideas, CSS structure, and initial timer logic.

### Prompt input
"Create a minimalist dark-mode CSS theme for a Pomodoro timer using a deep dark background (#0d0e12)... style a timer-display with tabular-nums so numbers don't jump."

### What the AI provided
It helped generate a baseline structure for the HTML, CSS, and timer logic, which was useful for getting the initial app shell in place quickly.

### What I changed from the AI output
The early timer implementation was too tightly coupled to simple UI updates. I reworked the countdown so it is driven from an absolute end timestamp, which keeps the timer accurate across refreshes and tab switching. I also added persistence for settings, timer state, and daily history, plus a browser-tab countdown title and an audible completion cue.

## 5. Honest gap
If I had one more day with this project, the next improvement I would make is a more advanced circular progress animation inside the timer ring itself. Right now the timer communicates state clearly through text, color, and motion, but a true progress ring would make phase changes feel even more satisfying and informative at a glance.

The next step would be to render a visual progress stroke that depletes smoothly during each session and switches color between focus and break states.
 
