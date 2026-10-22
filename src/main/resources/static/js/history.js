// Pomodoro history page: today / week statistics, a 7 day focus chart and the session list.
(function () {
    "use strict";

    const PAGE_SIZE = 20;

    document.addEventListener("DOMContentLoaded", () => {
        const statsNode = document.querySelector("[data-history-stats]");
        if (!statsNode) return;

        const chart = document.querySelector("[data-history-chart]");
        const list = document.querySelector("[data-session-list]");
        const empty = document.querySelector("[data-history-empty]");
        const next = document.querySelector("[data-next-page]");
        const message = document.querySelector("[data-history-message]");
        const state = {
            page: 0,
            totalPages: 0,
            deviceNames: new Map()
        };

        function el(tag, text, className) {
            const node = document.createElement(tag);
            if (text !== undefined) {
                node.textContent = text;
            }
            if (className) {
                node.className = className;
            }
            return node;
        }

        async function read(response, fallback) {
            const raw = await response.text();
            let data = null;
            try {
                data = raw ? JSON.parse(raw) : null;
            } catch (_) {
                data = null;
            }
            if (!response.ok) {
                throw new Error(data?.message || fallback);
            }
            return data;
        }

        function minutes(seconds) {
            return `${Math.round((Number(seconds) || 0) / 60)} min`;
        }

        function fail(text) {
            message.textContent = text;
            message.classList.remove("hidden");
            message.classList.add("form-message--error");
        }

        function renderStatCard(label, value) {
            const card = el("article", undefined, "history-stat");
            card.append(el("span", label));
            card.append(el("strong", minutes(value?.focusSeconds)));
            card.append(el("small", `${value?.completedWorkSessions || 0} completed work sessions`));
            return card;
        }

        function renderDayBar(day, maxFocusSeconds) {
            const focusSeconds = Number(day.focusSeconds) || 0;
            const focusMinutes = Math.round(focusSeconds / 60);
            const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" })
                .format(new Date(`${day.date}T12:00:00`));

            const bar = el("div", undefined, "history-bar");
            bar.setAttribute("aria-label", `${day.date}: ${focusMinutes} focus minutes`);
            const fill = el("div", undefined, "history-bar__fill");
            fill.style.height = `${Math.max(2, (focusSeconds / maxFocusSeconds) * 100)}%`;
            bar.append(fill, el("strong", String(focusMinutes)), el("span", weekday));
            return bar;
        }

        async function loadStats() {
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const response = await fetch(`/api/pomodoro-sessions/stats?tz=${encodeURIComponent(timeZone)}`);
            const data = await read(response, "Could not load history statistics.");

            statsNode.replaceChildren(
                renderStatCard("Today", data.today),
                renderStatCard("This week", data.week)
            );

            const days = data.days || [];
            const maxFocusSeconds = Math.max(1, ...days.map(day => Number(day.focusSeconds) || 0));
            chart.replaceChildren(...days.map(day => renderDayBar(day, maxFocusSeconds)));
        }

        async function loadDeviceNames() {
            const devices = await read(await fetch("/api/devices"), "Could not load devices.");
            (devices || []).forEach((device) => {
                state.deviceNames.set(String(device.id), device.name || "Unnamed cube");
            });
        }

        function sourceText(session) {
            if (session.source !== "DEVICE") {
                return "Web";
            }
            if (session.deviceId === null || session.deviceId === undefined) {
                return "Cube (unbound)";
            }
            return `Cube · ${state.deviceNames.get(String(session.deviceId)) || "Unknown cube"}`;
        }

        function typeText(session) {
            return String(session.type || session.webMode || "Session").replaceAll("_", " ");
        }

        function renderSession(session) {
            const row = el("article", undefined, "history-session");

            const title = el("div");
            title.append(el("strong", typeText(session)), el("small", `${sourceText(session)} · ${session.status || ""}`));

            const duration = el("div");
            duration.append(
                el("strong", `${minutes(session.actualDurationSeconds)} actual`),
                el("small", `${minutes(session.plannedDurationSeconds)} planned`)
            );

            const when = el("time", session.startedAt
                ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })
                    .format(new Date(session.startedAt))
                : "Start time not reported");
            if (session.startedAt) {
                when.dateTime = new Date(session.startedAt).toISOString();
            }

            row.append(title, duration, when);
            return row;
        }

        async function loadPage(reset = false) {
            if (reset) {
                state.page = 0;
                list.replaceChildren();
            }
            const response = await fetch(`/api/pomodoro-sessions?page=${state.page}&size=${PAGE_SIZE}`);
            const data = await read(response, "Could not load sessions.");
            (data.items || []).forEach(session => list.append(renderSession(session)));
            state.totalPages = data.totalPages || 0;
            empty.classList.toggle("hidden", list.children.length > 0);
            next.classList.toggle("hidden", state.page + 1 >= state.totalPages);
        }

        next.addEventListener("click", async () => {
            state.page += 1;
            try {
                await loadPage();
            } catch (error) {
                fail(error.message);
            }
        });

        Promise.all([loadDeviceNames(), loadStats()])
            .then(() => loadPage(true))
            .catch(error => fail(error.message));
    });
})();
