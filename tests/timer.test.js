/**
 * Tests for js/timer.js
 *
 * timer.js wraps all logic in a DOMContentLoaded listener and uses a Web
 * Worker for tick events.  For each test we:
 *   1. Set up the required DOM (matching index.html structure).
 *   2. Replace global.Worker with a controllable mock so we can trigger ticks
 *      on demand and inspect postMessage calls.
 *   3. Replace global.Audio to suppress real audio playback and allow
 *      assertions on sound calls.
 *   4. Require a fresh copy of the module (jest.resetModules) and fire
 *      DOMContentLoaded to initialise the timer state.
 *
 * Time is controlled with jest.useFakeTimers + jest.setSystemTime so that
 * Date.now()-based countdown arithmetic is deterministic.
 */

// ---------------------------------------------------------------------------
// Worker mock
// ---------------------------------------------------------------------------

let mockWorkerInstance = null;

function createMockWorkerClass() {
    return class MockWorker {
        constructor() {
            this.postMessage = jest.fn();
            this.onmessage   = null;
            mockWorkerInstance = this;
        }
    };
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function setupDOM() {
    document.body.innerHTML = `
        <button id="settingsToggle" aria-disabled="false"></button>
        <span   id="timeDisplay">25:00</span>
        <span   class="timer-label">Focus Time</span>
        <svg>
          <circle class="timer-progress-bar" cx="100" cy="100" r="90"></circle>
        </svg>
        <span class="mode-label mode-label--active" data-mode="pomodoro">Pomodoro</span>
        <span class="mode-label" data-mode="short-break">Short Break</span>
        <span class="mode-label" data-mode="long-break">Long Break</span>
        <button id="startBtn"><span class="btn-text">Start</span></button>
        <button id="resetBtn"><span class="btn-text">Reset</span></button>
        <span   id="sessionCount">1</span>
    `;
}

function loadTimerModule() {
    jest.resetModules();
    require('../js/timer');
    document.dispatchEvent(new Event('DOMContentLoaded'));
}

// ---------------------------------------------------------------------------
// Tick helper – simulates the Worker sending a tick to the main thread
// ---------------------------------------------------------------------------

function triggerTick() {
    if (mockWorkerInstance && mockWorkerInstance.onmessage) {
        mockWorkerInstance.onmessage({ data: 'tick' });
    }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('timer.js', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(0);

        mockWorkerInstance  = null;
        global.Worker = createMockWorkerClass();
        global.Audio  = jest.fn().mockImplementation(() => ({
            play: jest.fn().mockResolvedValue(undefined),
        }));

        localStorage.clear();
        setupDOM();
        loadTimerModule();
    });

    afterEach(() => {
        jest.useRealTimers();
        delete global.Worker;
        delete global.Audio;
    });

    // -----------------------------------------------------------------------
    // Initialisation
    // -----------------------------------------------------------------------

    test('displays 25:00 on initialisation', () => {
        expect(document.getElementById('timeDisplay').textContent).toBe('25:00');
    });

    test('shows "Focus Time" label on initialisation', () => {
        expect(document.querySelector('.timer-label').textContent).toBe('Focus Time');
    });

    test('start button reads "Start" on initialisation', () => {
        expect(document.getElementById('startBtn').querySelector('.btn-text').textContent).toBe('Start');
    });

    test('session count starts at 1', () => {
        expect(document.getElementById('sessionCount').textContent).toBe('1');
    });

    test('settings toggle is enabled on initialisation', () => {
        expect(document.getElementById('settingsToggle').disabled).toBe(false);
    });

    test('pomodoro mode label is marked active on initialisation', () => {
        const active = document.querySelector('.mode-label--active');
        expect(active.dataset.mode).toBe('pomodoro');
    });

    // -----------------------------------------------------------------------
    // Start / pause
    // -----------------------------------------------------------------------

    test('clicking start changes button text to "Pause"', () => {
        document.getElementById('startBtn').click();
        expect(document.getElementById('startBtn').querySelector('.btn-text').textContent).toBe('Pause');
    });

    test('clicking start sends "start" to the worker', () => {
        document.getElementById('startBtn').click();
        expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith('start');
    });

    test('clicking start while running (pause) changes button text back to "Start"', () => {
        document.getElementById('startBtn').click(); // start
        document.getElementById('startBtn').click(); // pause
        expect(document.getElementById('startBtn').querySelector('.btn-text').textContent).toBe('Start');
    });

    test('clicking pause sends "stop" to the worker', () => {
        document.getElementById('startBtn').click(); // start
        document.getElementById('startBtn').click(); // pause
        expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith('stop');
    });

    // -----------------------------------------------------------------------
    // Settings toggle state while timer runs
    // -----------------------------------------------------------------------

    test('settings toggle is disabled while the timer is running', () => {
        document.getElementById('startBtn').click();
        expect(document.getElementById('settingsToggle').disabled).toBe(true);
    });

    test('settings toggle becomes enabled again after pausing', () => {
        document.getElementById('startBtn').click(); // start
        document.getElementById('startBtn').click(); // pause
        expect(document.getElementById('settingsToggle').disabled).toBe(false);
    });

    // -----------------------------------------------------------------------
    // Countdown display
    // -----------------------------------------------------------------------

    test('display updates each second while running', () => {
        // endTime = 0 + 25*60*1000 = 1 500 000 ms
        document.getElementById('startBtn').click();
        jest.setSystemTime(1000); // 1 s elapsed
        triggerTick();
        // secondsLeft = round((1 500 000 – 1 000) / 1000) = 1499 s = 24:59
        expect(document.getElementById('timeDisplay').textContent).toBe('24:59');
    });

    test('display shows 00:00 at the exact expiry moment', () => {
        document.getElementById('startBtn').click();
        // advance to exactly 0 seconds remaining (not past end)
        jest.setSystemTime(1500000);
        triggerTick();
        // secondsLeft = round(0 / 1000) = 0  → updateDisplay called → 00:00
        expect(document.getElementById('timeDisplay').textContent).toBe('00:00');
    });

    // -----------------------------------------------------------------------
    // Reset
    // -----------------------------------------------------------------------

    test('clicking reset restores the 25:00 display', () => {
        document.getElementById('startBtn').click();
        jest.setSystemTime(5000);
        triggerTick(); // advance a few seconds
        document.getElementById('resetBtn').click();
        expect(document.getElementById('timeDisplay').textContent).toBe('25:00');
    });

    test('clicking reset stops the timer (button back to "Start")', () => {
        document.getElementById('startBtn').click();
        document.getElementById('resetBtn').click();
        expect(document.getElementById('startBtn').querySelector('.btn-text').textContent).toBe('Start');
    });

    test('clicking reset restores session count to 1', () => {
        document.getElementById('resetBtn').click();
        expect(document.getElementById('sessionCount').textContent).toBe('1');
    });

    // -----------------------------------------------------------------------
    // Cycle completion – pomodoro → break
    // -----------------------------------------------------------------------

    test('when pomodoro ends it switches to short-break mode', () => {
        document.getElementById('startBtn').click();
        // endTime = 1 500 000; advance 2 s past it
        jest.setSystemTime(1500000 + 2000);
        triggerTick();
        expect(document.querySelector('.timer-label').textContent).toBe('Short Break');
        expect(document.getElementById('timeDisplay').textContent).toBe('05:00');
    });

    test('when pomodoro ends the break timer auto-starts (button stays "Pause")', () => {
        document.getElementById('startBtn').click();
        jest.setSystemTime(1500000 + 2000);
        triggerTick();
        expect(document.getElementById('startBtn').querySelector('.btn-text').textContent).toBe('Pause');
    });

    test('when short break ends it switches back to pomodoro mode', () => {
        document.getElementById('startBtn').click();

        // Complete pomodoro (now = 1 502 000)
        jest.setSystemTime(1500000 + 2000);
        triggerTick();

        // Short-break endTime = 1 502 000 + 5*60*1000 = 1 802 000
        // Advance 2 s past it → 1 804 000
        jest.setSystemTime(1500000 + 2000 + 300000 + 2000);
        triggerTick();

        expect(document.querySelector('.timer-label').textContent).toBe('Focus Time');
        expect(document.getElementById('timeDisplay').textContent).toBe('25:00');
    });

    test('session count increments after each short break', () => {
        document.getElementById('startBtn').click();

        jest.setSystemTime(1500000 + 2000);
        triggerTick(); // complete pomodoro

        jest.setSystemTime(1500000 + 2000 + 300000 + 2000);
        triggerTick(); // complete short break

        expect(document.getElementById('sessionCount').textContent).toBe('2');
    });

    // -----------------------------------------------------------------------
    // Cycle completion – every 4th pomodoro triggers a long break
    // -----------------------------------------------------------------------

    test('4th pomodoro triggers a long break', () => {
        document.getElementById('startBtn').click();

        let now = 0;

        // Complete 3 pomodoro + short-break cycles
        for (let i = 0; i < 3; i++) {
            now += 25 * 60 * 1000 + 2000;
            jest.setSystemTime(now);
            triggerTick(); // complete pomodoro → short break starts

            now += 5 * 60 * 1000 + 2000;
            jest.setSystemTime(now);
            triggerTick(); // complete short break → pomodoro starts
        }

        // Complete the 4th pomodoro
        now += 25 * 60 * 1000 + 2000;
        jest.setSystemTime(now);
        triggerTick(); // pomodoroCount hits 4 → long break

        expect(document.querySelector('.timer-label').textContent).toBe('Long Break');
        expect(document.getElementById('timeDisplay').textContent).toBe('15:00');
    });

    test('session count resets to 1 after a long break completes', () => {
        document.getElementById('startBtn').click();

        let now = 0;

        // Complete 3 pomodoro + short-break cycles
        for (let i = 0; i < 3; i++) {
            now += 25 * 60 * 1000 + 2000;
            jest.setSystemTime(now);
            triggerTick(); // complete pomodoro

            now += 5 * 60 * 1000 + 2000;
            jest.setSystemTime(now);
            triggerTick(); // complete short break
        }

        // Complete 4th pomodoro → long break
        now += 25 * 60 * 1000 + 2000;
        jest.setSystemTime(now);
        triggerTick();

        // Complete long break (15 min)
        now += 15 * 60 * 1000 + 2000;
        jest.setSystemTime(now);
        triggerTick();

        expect(document.getElementById('sessionCount').textContent).toBe('1');
        expect(document.querySelector('.timer-label').textContent).toBe('Focus Time');
    });

    // -----------------------------------------------------------------------
    // settings:updated integration
    // -----------------------------------------------------------------------

    test('settings:updated changes timer duration when the timer is not running', () => {
        document.dispatchEvent(new CustomEvent('settings:updated', {
            detail: { pomodoro: 30, shortBreak: 5, longBreak: 15, soundEnabled: true },
        }));
        expect(document.getElementById('timeDisplay').textContent).toBe('30:00');
    });

    test('settings:updated does not reset timer mid-session', () => {
        document.getElementById('startBtn').click(); // endTime = 1 500 000

        jest.setSystemTime(5000);
        triggerTick(); // display → 24:55

        document.dispatchEvent(new CustomEvent('settings:updated', {
            detail: { pomodoro: 30, shortBreak: 5, longBreak: 15, soundEnabled: true },
        }));

        // isRunning is true → setMode not called → display unchanged
        expect(document.getElementById('timeDisplay').textContent).toBe('24:55');
    });

    // -----------------------------------------------------------------------
    // Sound
    // -----------------------------------------------------------------------

    test('plays timer_sound_up.wav when starting a fresh pomodoro', () => {
        document.getElementById('startBtn').click();
        expect(global.Audio).toHaveBeenCalledWith('assets/sounds/timer_sound_up.wav');
    });

    test('plays timer_sound_down.wav when the reset button is clicked', () => {
        document.getElementById('resetBtn').click();
        expect(global.Audio).toHaveBeenCalledWith('assets/sounds/timer_sound_down.wav');
    });

    test('plays timer_sound_down.wav when a pomodoro cycle completes', () => {
        document.getElementById('startBtn').click();
        jest.setSystemTime(1500000 + 2000);
        triggerTick();
        expect(global.Audio).toHaveBeenCalledWith('assets/sounds/timer_sound_down.wav');
    });

    test('no sound is played when soundEnabled is false', () => {
        localStorage.setItem('pomodoroSettings', JSON.stringify({
            pomodoro: 25, shortBreak: 5, longBreak: 15, soundEnabled: false,
        }));
        setupDOM();
        loadTimerModule();

        // Clear any calls that might have come from the extra DOMContentLoaded
        global.Audio.mockClear();

        document.getElementById('startBtn').click();
        expect(global.Audio).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Guard clause – missing required DOM elements
    // -----------------------------------------------------------------------

    test('does not throw when required DOM elements are missing', () => {
        document.body.innerHTML = ''; // strip all elements
        jest.resetModules();
        expect(() => {
            require('../js/timer');
            document.dispatchEvent(new Event('DOMContentLoaded'));
        }).not.toThrow();
    });
});
