import assert from "node:assert/strict";
import test from "node:test";

import {
    addHook,
    baseContext,
    createFetch,
    createPageDocument,
    flush,
    jsonResponse,
    runPageScripts
} from "./page-dom.test-utils.mjs";

const stats = {
    timeZone: "Europe/Kyiv",
    today: { completedWorkSessions: 3, interruptedSessions: 1, focusSeconds: 4500, breakSeconds: 600 },
    week: { completedWorkSessions: 9, interruptedSessions: 2, focusSeconds: 15000, breakSeconds: 3000 },
    days: [
        { date: "2026-10-16", completedWorkSessions: 0, focusSeconds: 0 },
        { date: "2026-10-17", completedWorkSessions: 1, focusSeconds: 1500 },
        { date: "2026-10-18", completedWorkSessions: 0, focusSeconds: 0 },
        { date: "2026-10-19", completedWorkSessions: 2, focusSeconds: 3000 },
        { date: "2026-10-20", completedWorkSessions: 1, focusSeconds: 1500 },
        { date: "2026-10-21", completedWorkSessions: 2, focusSeconds: 4500 },
        { date: "2026-10-22", completedWorkSessions: 3, focusSeconds: 4500 }
    ]
};

const webSession = {
    id: 1,
    type: "WORK",
    webMode: "pomodoro",
    source: "WEB",
    status: "COMPLETED",
    deviceId: null,
    plannedDurationSeconds: 1500,
    actualDurationSeconds: 1500,
    startedAt: Date.UTC(2026, 9, 22, 8, 0),
    finishedAt: Date.UTC(2026, 9, 22, 8, 25)
};

const cubeSession = {
    ...webSession,
    id: 2,
    type: "SHORT_BREAK",
    webMode: "short-break",
    source: "DEVICE",
    status: "INTERRUPTED",
    deviceId: 4,
    plannedDurationSeconds: 300,
    actualDurationSeconds: 120
};

function setup({ pages = [[webSession, cubeSession]], devices = [{ id: 4, name: "Desk cube" }] } = {}) {
    const document = createPageDocument();
    const main = addHook(document, document.body, "main");
    addHook(document, main, "p", { "data-history-message": "", class: "form-message hidden" });
    addHook(document, main, "div", { "data-history-stats": "" });
    addHook(document, main, "div", { "data-history-chart": "" });
    addHook(document, main, "div", { "data-session-list": "" });
    addHook(document, main, "p", { "data-history-empty": "", class: "hidden" });
    addHook(document, main, "button", { "data-next-page": "", class: "hidden" });

    const http = createFetch((url) => {
        if (url.startsWith("/api/pomodoro-sessions/stats")) return jsonResponse(stats);
        if (url === "/api/devices") return jsonResponse(devices);
        const pageMatch = url.match(/^\/api\/pomodoro-sessions\?page=(\d+)&size=20$/);
        if (pageMatch) {
            const page = Number(pageMatch[1]);
            return jsonResponse({
                items: pages[page] || [],
                page,
                size: 20,
                totalItems: pages.flat().length,
                totalPages: pages.length
            });
        }
        return undefined;
    });

    runPageScripts(baseContext(document, { fetch: http.fetch, setTimeout, clearTimeout }), ["history.js"]);
    const $ = selector => document.querySelector(selector);
    const rows = () => $("[data-session-list]").querySelectorAll("article");
    return { document, http, $, rows };
}

test("stats for today and the week are rendered", async () => {
    const page = setup();
    await flush();
    const cards = page.$("[data-history-stats]").querySelectorAll("article");
    assert.equal(cards.length, 2);
    assert.match(cards[0].textContent, /Today/);
    assert.match(cards[0].textContent, /75 min/);
    assert.match(cards[0].textContent, /3 completed work sessions/);
    assert.match(cards[1].textContent, /This week/);
    assert.match(cards[1].textContent, /250 min/);
});

test("the browser time zone is sent with the stats request", async () => {
    const page = setup();
    await flush();
    const call = page.http.calls.find(item => item.url.startsWith("/api/pomodoro-sessions/stats"));
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    assert.equal(call.url, `/api/pomodoro-sessions/stats?tz=${encodeURIComponent(timeZone)}`);
});

test("seven day chart has one labelled bar per day", async () => {
    const page = setup();
    await flush();
    const bars = page.$("[data-history-chart]").querySelectorAll("div.history-bar");
    assert.equal(bars.length, 7);
    assert.equal(bars[0].getAttribute("aria-label"), "2026-10-16: 0 focus minutes");
    assert.equal(bars[6].getAttribute("aria-label"), "2026-10-22: 75 focus minutes");
    assert.equal(bars[6].querySelector(".history-bar__fill").style.height, "100%");
});

test("session rows show type, source with cube name, status and durations", async () => {
    const page = setup();
    await flush();
    const [web, cube] = page.rows();
    assert.equal(page.rows().length, 2);
    assert.match(web.textContent, /WORK/);
    assert.match(web.textContent, /Web · COMPLETED/);
    assert.match(web.textContent, /25 min actual/);

    assert.match(cube.textContent, /SHORT BREAK/);
    assert.match(cube.textContent, /Cube · Desk cube · INTERRUPTED/);
    assert.match(cube.textContent, /2 min actual/);
    assert.match(cube.textContent, /5 min planned/);
    assert.doesNotMatch(cube.textContent, /\$ ?\{/);
});

test("sessions of an unbound cube are labelled as such", async () => {
    const page = setup({ pages: [[{ ...cubeSession, deviceId: null }]] });
    await flush();
    assert.match(page.rows()[0].textContent, /Cube \(unbound\)/);
});

test("load more requests the next page and hides itself on the last page", async () => {
    const page = setup({ pages: [[webSession], [cubeSession]] });
    await flush();
    const next = page.$("[data-next-page]");
    assert.equal(next.classList.contains("hidden"), false);

    next.click();
    await flush();
    assert.ok(page.http.calls.some(call => call.url === "/api/pomodoro-sessions?page=1&size=20"));
    assert.equal(page.rows().length, 2);
    assert.equal(next.classList.contains("hidden"), true);
});

test("empty history shows the empty state", async () => {
    const page = setup({ pages: [[]] });
    await flush();
    assert.equal(page.rows().length, 0);
    assert.equal(page.$("[data-history-empty]").classList.contains("hidden"), false);
    assert.equal(page.$("[data-next-page]").classList.contains("hidden"), true);
});
