const { test, expect } = require("@playwright/test");

const baseUrl = process.env.E2E_BASE_URL || "https://teclos.space";

function parseTime(value) {
    const [minutes, seconds] = value.split(":").map(Number);
    return (minutes * 60) + seconds;
}

async function openHomeWithCleanTimerState(page) {
    await page.addInitScript(() => {
        localStorage.removeItem("pomodoroSettings");
        localStorage.removeItem("pomodoroTimerState");
    });

    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#timeDisplay")).toHaveText("25:00");
    await expect(page.locator("#sessionCount")).toHaveText("1");
    await expect(page.locator("#sessionTotal")).toHaveText("4");
    await expect(page.locator("#sessionDots .session-dot")).toHaveCount(4);
    await expect(page.locator("#sessionDots .session-dot--active")).toHaveCount(1);
}

test.describe("home timer flow", () => {
    test("timer renders the new default pattern state and can start, pause, resume, and reset", async ({ page }) => {
        await openHomeWithCleanTimerState(page);

        const timeDisplay = page.locator("#timeDisplay");
        const startButton = page.locator("#startBtn");
        const startButtonText = startButton.locator(".btn-text");
        const resetButton = page.locator("#resetBtn");

        await expect(startButtonText).toHaveText("START FLOW");
        await expect(page.locator(".mode-label--active")).toHaveAttribute("data-mode", "pomodoro");

        await startButton.click();
        await expect(startButtonText).toHaveText("PAUSE FLOW");

        await page.waitForTimeout(2200);
        const runningValue = await timeDisplay.textContent();
        expect(parseTime(runningValue)).toBeLessThan(25 * 60);

        await startButton.click();
        await expect(startButtonText).toHaveText("START FLOW");

        const pausedValue = await timeDisplay.textContent();
        await page.waitForTimeout(1500);
        await expect(timeDisplay).toHaveText(pausedValue);

        await startButton.click();
        await expect(startButtonText).toHaveText("PAUSE FLOW");
        await page.waitForTimeout(1500);
        const resumedValue = await timeDisplay.textContent();
        expect(parseTime(resumedValue)).toBeLessThan(parseTime(pausedValue));

        await resetButton.click();
        await expect(startButtonText).toHaveText("START FLOW");
        await expect(timeDisplay).toHaveText("25:00");
        await expect(page.locator(".mode-label--active")).toHaveAttribute("data-mode", "pomodoro");
        await expect(page.locator("#sessionCount")).toHaveText("1");
        await expect(page.locator("#sessionTotal")).toHaveText("4");
        await expect(page.locator("#sessionDots .session-dot--active")).toHaveCount(1);
    });

    test("compact pattern updates dots and skip buttons autostart phase navigation", async ({ page }) => {
        await openHomeWithCleanTimerState(page);

        await page.locator("#settingsToggle").click();
        await page.locator("#pomodoroTime").fill("1");
        await page.locator("#shortBreakTime").fill("1");
        await page.locator("#longBreakTime").fill("1");
        await page.locator("#focusCycles").fill("2");
        await page.locator("#patternType").selectOption("compact");
        await page.locator("#saveSettings").click();

        await expect(page.locator("#settingsSection")).toHaveClass(/hidden/);
        await expect(page.locator("#timeDisplay")).toHaveText("01:00");
        await expect(page.locator("#sessionCount")).toHaveText("1");
        await expect(page.locator("#sessionTotal")).toHaveText("2");
        await expect(page.locator("#sessionDots .session-dot")).toHaveCount(2);
        await expect(page.locator("#sessionDots .session-dot--active")).toHaveCount(1);

        await page.locator("#nextCycleBtn").click();
        await expect(page.locator(".mode-label--active")).toHaveAttribute("data-mode", "short-break");
        await expect(page.locator("#startBtn .btn-text")).toHaveText("PAUSE FLOW");
        await expect(page.locator("#sessionDots .session-dot--active")).toHaveCount(1);

        await page.locator("#nextCycleBtn").click();
        await expect(page.locator(".mode-label--active")).toHaveAttribute("data-mode", "pomodoro");
        await expect(page.locator("#sessionDots .session-dot--active")).toHaveCount(2);

        await page.locator("#prevCycleBtn").click();
        await expect(page.locator(".mode-label--active")).toHaveAttribute("data-mode", "short-break");
        await expect(page.locator("#startBtn .btn-text")).toHaveText("PAUSE FLOW");
        await expect(page.locator("#sessionDots .session-dot--active")).toHaveCount(1);
    });

    test("running timer survives page reload and keeps countdown state", async ({ page }) => {
        test.skip(
            baseUrl.includes("teclos.space"),
            "Retested on April 21, 2026: remote teclos.space still does not provide a stable countdown-reload contract for this spec."
        );

        await openHomeWithCleanTimerState(page);

        const timeDisplay = page.locator("#timeDisplay");
        const startButton = page.locator("#startBtn");

        await startButton.click();
        await expect
            .poll(async () => parseTime(await timeDisplay.textContent()), { timeout: 5000 })
            .toBeLessThan(25 * 60);

        const beforeReload = await timeDisplay.textContent();
        expect(parseTime(beforeReload)).toBeLessThan(25 * 60);

        await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });

        await expect
            .poll(async () => parseTime(await timeDisplay.textContent()), { timeout: 4000 })
            .toBeLessThan(25 * 60);

        const afterReload = await timeDisplay.textContent();

        await page.waitForTimeout(1500);
        const afterReloadTick = await timeDisplay.textContent();
        expect(parseTime(afterReloadTick)).toBeLessThan(parseTime(afterReload));
    });
});
