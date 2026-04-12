/**
 * Tests for js/worker.js
 *
 * worker.js runs in a Web Worker context.  In Jest's jsdom environment
 * `self === window`, so the script assigns its message handler to
 * `window.onmessage` and calls `window.postMessage` for outgoing "tick"
 * messages.  We shadow `window.postMessage` with a jest.fn() so that the
 * two-argument requirement of jsdom's built-in postMessage is bypassed.
 */

describe('worker.js', () => {
    // Convenience aliases that reflect the module's use of the global scope
    const send    = (data) => window.onmessage({ data });
    const getMock = ()      => window.postMessage;

    beforeEach(() => {
        jest.useFakeTimers();
        // Shadow jsdom's window.postMessage with a plain mock so worker.js can
        // call self.postMessage("tick") without the two-argument constraint.
        window.postMessage = jest.fn();
        jest.resetModules();
        require('../js/worker');
        // After require, window.onmessage holds the handler set by worker.js
    });

    afterEach(() => {
        jest.useRealTimers();
        delete window.onmessage;
    });

    test('sends a "tick" message every second after receiving "start"', () => {
        send('start');
        jest.advanceTimersByTime(3000);
        expect(getMock()).toHaveBeenCalledTimes(3);
        expect(getMock()).toHaveBeenCalledWith('tick');
    });

    test('stops sending ticks after receiving "stop"', () => {
        send('start');
        jest.advanceTimersByTime(2000);
        send('stop');
        jest.advanceTimersByTime(5000);
        expect(getMock()).toHaveBeenCalledTimes(2);
    });

    test('clears the existing interval when "start" is received again', () => {
        send('start');
        jest.advanceTimersByTime(1000); // 1 tick

        // Second start should restart the interval, not stack it
        send('start');
        jest.advanceTimersByTime(2000); // 2 ticks from fresh interval

        expect(getMock()).toHaveBeenCalledTimes(3);
    });

    test('calling "stop" before "start" does not throw', () => {
        expect(() => send('stop')).not.toThrow();
    });

    test('unknown commands are silently ignored', () => {
        expect(() => send('unknown')).not.toThrow();
        jest.advanceTimersByTime(3000);
        expect(getMock()).not.toHaveBeenCalled();
    });

    test('sends no ticks before "start" is called', () => {
        jest.advanceTimersByTime(5000);
        expect(getMock()).not.toHaveBeenCalled();
    });
});
