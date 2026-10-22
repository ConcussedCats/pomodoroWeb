// Shared live channel for device updates (server -> browser only, see docs/esp32/WEB-API.md).
// Usage:
//   const off = TelosDeviceLive.subscribe((message) => { ... });
//   TelosDeviceLive.onConnection((status) => { ... }); // "connecting" | "open" | "closed"
// After every (re)connect subscribers get { type: "RESYNC" } and should reload REST snapshots,
// because messages sent while the socket was down are lost.
(function () {
    if (window.TelosDeviceLive) return; // loaded twice on a page: keep the first, single socket

    const MIN_RETRY_MS = 1_000;
    const MAX_RETRY_MS = 30_000;

    const messageListeners = new Set();
    const connectionListeners = new Set();
    let socket = null;
    let status = "closed";
    let retryMs = MIN_RETRY_MS;
    let retryTimer = null;
    let started = false;

    function isAuthenticated() {
        return window.TelosAuth?.authenticated === true
            || document.querySelector('meta[name="is-authenticated"]')?.content === "true";
    }

    function setStatus(nextStatus) {
        if (status === nextStatus) return;
        status = nextStatus;
        connectionListeners.forEach((listener) => {
            try {
                listener(status);
            } catch (error) {
                console.warn("Device live connection listener failed.", error);
            }
        });
    }

    function emit(message) {
        messageListeners.forEach((listener) => {
            try {
                listener(message);
            } catch (error) {
                console.warn("Device live listener failed.", error);
            }
        });
    }

    function socketUrl() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${window.location.host}/ws/devices`;
    }

    function scheduleReconnect() {
        if (retryTimer || typeof window.WebSocket !== "function") return;
        const delay = retryMs;
        retryMs = Math.min(MAX_RETRY_MS, retryMs * 2);
        retryTimer = window.setTimeout(() => {
            retryTimer = null;
            connect();
        }, delay);
    }

    function connect() {
        if (typeof window.WebSocket !== "function") return;
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

        setStatus("connecting");
        try {
            socket = new WebSocket(socketUrl());
        } catch (error) {
            setStatus("closed");
            scheduleReconnect();
            return;
        }

        socket.addEventListener("open", () => {
            retryMs = MIN_RETRY_MS;
            setStatus("open");
            emit({ type: "RESYNC" });
        });

        socket.addEventListener("message", (event) => {
            let message;
            try {
                message = JSON.parse(event.data);
            } catch (error) {
                return;
            }
            if (message && typeof message.type === "string") {
                emit(message);
            }
        });

        socket.addEventListener("close", () => {
            socket = null;
            setStatus("closed");
            scheduleReconnect();
        });

        socket.addEventListener("error", () => {
            // "close" follows and schedules the retry.
        });
    }

    function start() {
        if (started || !isAuthenticated()) return;
        started = true;
        connect();

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible" && !socket) {
                window.clearTimeout(retryTimer);
                retryTimer = null;
                retryMs = MIN_RETRY_MS;
                connect();
            }
        });
        window.addEventListener("online", () => {
            if (!socket) {
                window.clearTimeout(retryTimer);
                retryTimer = null;
                connect();
            }
        });
    }

    window.TelosDeviceLive = {
        subscribe(listener) {
            messageListeners.add(listener);
            start();
            return () => messageListeners.delete(listener);
        },
        onConnection(listener) {
            connectionListeners.add(listener);
            listener(status);
            return () => connectionListeners.delete(listener);
        },
        getStatus: () => status
    };
})();
