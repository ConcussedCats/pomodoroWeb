/**
 * Tests for js/settings.js
 *
 * settings.js runs top-level code at load time (DOM queries, event listener
 * registration, and an initial loadSettings() call).  We set up the required
 * DOM before each require so the module finds its elements, and we use
 * jest.resetModules() to get a fresh module execution for every test.
 */

const SETTINGS_KEY = 'pomodoroSettings';

function setupDOM() {
    document.body.innerHTML = `
        <button id="settingsToggle"></button>
        <div id="timerSection" class="section-view"></div>
        <div id="settingsSection" class="section-view hidden"></div>
        <button id="saveSettings"></button>
        <button id="cancelSettings"></button>
        <input type="number" id="pomodoroTime"  value="25" />
        <input type="number" id="shortBreakTime" value="5"  />
        <input type="number" id="longBreakTime"  value="15" />
        <input type="checkbox" id="soundEnabled" checked />
    `;
}

function loadModule() {
    jest.resetModules();
    require('../js/settings');
}

describe('settings.js', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM();
        loadModule();
    });

    // -------------------------------------------------------------------------
    // Default settings
    // -------------------------------------------------------------------------

    test('populates inputs with defaults when no saved settings exist', () => {
        expect(document.getElementById('pomodoroTime').value).toBe('25');
        expect(document.getElementById('shortBreakTime').value).toBe('5');
        expect(document.getElementById('longBreakTime').value).toBe('15');
        expect(document.getElementById('soundEnabled').checked).toBe(true);
    });

    // -------------------------------------------------------------------------
    // Restoring saved settings
    // -------------------------------------------------------------------------

    test('populates inputs from localStorage when settings are saved', () => {
        const saved = { pomodoro: 30, shortBreak: 10, longBreak: 20, soundEnabled: false };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved));
        setupDOM();
        loadModule();

        expect(document.getElementById('pomodoroTime').value).toBe('30');
        expect(document.getElementById('shortBreakTime').value).toBe('10');
        expect(document.getElementById('longBreakTime').value).toBe('20');
        expect(document.getElementById('soundEnabled').checked).toBe(false);
    });

    // -------------------------------------------------------------------------
    // Initialization event
    // -------------------------------------------------------------------------

    test('dispatches settings:loaded event on initialization', () => {
        const handler = jest.fn();
        document.addEventListener('settings:loaded', handler, { once: true });
        setupDOM();
        loadModule();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail).toMatchObject({ pomodoro: 25, soundEnabled: true });
    });

    // -------------------------------------------------------------------------
    // Open / close panel
    // -------------------------------------------------------------------------

    test('settings toggle opens the settings panel', () => {
        document.getElementById('settingsToggle').click();

        expect(document.getElementById('settingsSection').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('timerSection').classList.contains('hidden')).toBe(true);
    });

    test('settings toggle closes the panel when it is already open', () => {
        document.getElementById('settingsToggle').click(); // open
        document.getElementById('settingsToggle').click(); // close

        expect(document.getElementById('settingsSection').classList.contains('hidden')).toBe(true);
        expect(document.getElementById('timerSection').classList.contains('hidden')).toBe(false);
    });

    test('disabled settings toggle does not open the panel', () => {
        document.getElementById('settingsToggle').disabled = true;
        document.getElementById('settingsToggle').click();

        expect(document.getElementById('settingsSection').classList.contains('hidden')).toBe(true);
    });

    // -------------------------------------------------------------------------
    // Save settings
    // -------------------------------------------------------------------------

    test('save button writes settings to localStorage', () => {
        document.getElementById('pomodoroTime').value  = '30';
        document.getElementById('shortBreakTime').value = '10';
        document.getElementById('longBreakTime').value  = '20';
        document.getElementById('soundEnabled').checked  = false;
        document.getElementById('saveSettings').click();

        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        expect(saved).toEqual({ pomodoro: 30, shortBreak: 10, longBreak: 20, soundEnabled: false });
    });

    test('save button dispatches settings:updated event with current values', () => {
        const handler = jest.fn();
        document.addEventListener('settings:updated', handler);
        document.getElementById('pomodoroTime').value = '30';
        document.getElementById('saveSettings').click();
        document.removeEventListener('settings:updated', handler);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.pomodoro).toBe(30);
    });

    test('save button closes the settings panel', () => {
        document.getElementById('settingsToggle').click(); // open
        document.getElementById('saveSettings').click();   // save & close

        expect(document.getElementById('settingsSection').classList.contains('hidden')).toBe(true);
        expect(document.getElementById('timerSection').classList.contains('hidden')).toBe(false);
    });

    // -------------------------------------------------------------------------
    // Cancel settings
    // -------------------------------------------------------------------------

    test('cancel button closes the settings panel without saving', () => {
        document.getElementById('settingsToggle').click(); // open
        // Change value but do NOT dispatch the input event (no live save)
        document.getElementById('pomodoroTime').value = '99';
        document.getElementById('cancelSettings').click();

        expect(document.getElementById('settingsSection').classList.contains('hidden')).toBe(true);
        // Nothing should have been persisted
        expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();
    });

    // -------------------------------------------------------------------------
    // Live updates on input change
    // -------------------------------------------------------------------------

    test('changing a number input dispatches settings:updated immediately', () => {
        const handler = jest.fn();
        document.addEventListener('settings:updated', handler);
        const input = document.getElementById('pomodoroTime');
        input.value = '35';
        input.dispatchEvent(new Event('input'));
        document.removeEventListener('settings:updated', handler);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.pomodoro).toBe(35);
    });

    test('live input change is immediately saved to localStorage', () => {
        const input = document.getElementById('shortBreakTime');
        input.value = '8';
        input.dispatchEvent(new Event('input'));

        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        expect(saved.shortBreak).toBe(8);
    });

    test('changing the sound checkbox dispatches settings:updated immediately', () => {
        const handler = jest.fn();
        document.addEventListener('settings:updated', handler);
        const checkbox = document.getElementById('soundEnabled');
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change'));
        document.removeEventListener('settings:updated', handler);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.soundEnabled).toBe(false);
    });

    test('all three number inputs trigger live updates independently', () => {
        const inputs = [
            { id: 'pomodoroTime',   key: 'pomodoro',   value: '40' },
            { id: 'shortBreakTime', key: 'shortBreak', value: '7'  },
            { id: 'longBreakTime',  key: 'longBreak',  value: '18' },
        ];

        inputs.forEach(({ id, key, value }) => {
            const handler = jest.fn();
            document.addEventListener('settings:updated', handler);
            const el = document.getElementById(id);
            el.value = value;
            el.dispatchEvent(new Event('input'));
            document.removeEventListener('settings:updated', handler);

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0].detail[key]).toBe(Number(value));
        });
    });
});
