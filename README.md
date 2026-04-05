# Overview of the Project

A web-based Pomodoro timer that runs in your browser tab to help you stay focused and productive.

## What is the Pomodoro Technique?
The Pomodoro Technique is a time‑management method that splits work into focused sessions (Pomodoros) followed by short breaks.  
It’s more effective than a basic timer because it builds rest into the workflow, reduces burnout, and keeps your focus consistent.

## Features
- Pomodoro, Short Break, and Long Break modes
- Start / Reset controls
- Configurable session lengths
- Optional sound notifications
- Session counter for longer break tracking

## How to Use
1. Open the app by following the link: https://docholypancake.github.io/pomodoroWeb/.
2. Choose your mode (Pomodoro / Short Break / Long Break).
3. Click **Start** and focus until the timer ends.
4. Take the suggested break.
5. Repeat the cycle; after a few sessions, take a longer break.

## Please note
If you use Safari to run our timer, you won't be able to get sound notifications if run in the background, since Safari suspends most background tabs in about 10-15 seconds. Please use Pomodoro Web with Chrome for a better experience!

## Settings
Click the **Settings** button to customize:
- Pomodoro duration  
- Short break duration  
- Long break duration  
- Sound notifications  

Changes apply immediately after saving.

## Pages
- Timer: [index.html](index.html)  
- About: [about.html](about.html)  
- Help Us: [helpus.html](helpus.html)

## Project Structure
```
index.html
about.html
helpus.html
css/
  style.css
js/
  timer.js
  settings.js
  worker.js
assets/
  icon/
    icon.ico
  pictures/
    author.jpg
  sounds/
    timer_sound_up.wav
    timer_dound_down.wav
```

## Run Locally
You can open [index.html](index.html) directly in your browser.  
For best results, use a local server (prevents asset loading issues).

## Contributing
- Suggest changes or report issues:  
  https://github.com/docholypancake/pomodoroWeb/issues

## License
See [LICENSE](LICENSE).
