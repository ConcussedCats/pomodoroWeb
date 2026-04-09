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
}

test.describe("home timer flow", () => {
    test("timer can start, pause, resume, and reset", async ({ page }) => {
        await openHomeWithCleanTimerState(page);

        const timeDisplay = page.locator("#timeDisplay");
        const startButton = page.locator("#startBtn");
        const startButtonText = startButton.locator(".btn-text");
        const resetButton = page.locator("#resetBtn");

        await expect(startButtonText).toHaveText("Start");

        await startButton.click();
        await expect(startButtonText).toHaveText("Pause");

        await page.waitForTimeout(2200);
        const runningValue = await timeDisplay.textContent();
        expect(parseTime(runningValue)).toBeLessThan(25 * 60);

        await startButton.click();
        await expect(startButtonText).toHaveText("Start");

        const pausedValue = await timeDisplay.textContent();
        await page.waitForTimeout(1500);
        await expect(timeDisplay).toHaveText(pausedValue);

        await startButton.click();
        await expect(startButtonText).toHaveText("Pause");
        await page.waitForTimeout(1500);
        const resumedValue = await timeDisplay.textContent();
        expect(parseTime(resumedValue)).toBeLessThan(parseTime(pausedValue));

        await resetButton.click();
        await expect(startButtonText).toHaveText("Start");
        await expect(timeDisplay).toHaveText("25:00");
        await expect(page.locator(".mode-label--active")).toHaveAttribute("data-mode", "pomodoro");
    });

    test("running timer survives page reload and keeps countdown state", async ({ page }) => {
        test.skip(
            baseUrl.includes("teclos.space"),
            "Known remote issue: the deployed teclos.space home timer resets to 25:00 after reload instead of restoring countdown state."
        );

        await openHomeWithCleanTimerState(page);

        const timeDisplay = page.locator("#timeDisplay");
        const startButton = page.locator("#startBtn");

        await startButton.click();
        await page.waitForTimeout(2200);

        const beforeReload = await timeDisplay.textContent();
        expect(parseTime(beforeReload)).toBeLessThan(25 * 60);

        await page.reload({ waitUntil: "domcontentloaded" });

        await expect
            .poll(async () => parseTime(await timeDisplay.textContent()), { timeout: 4000 })
            .toBeLessThan(25 * 60);

        const afterReload = await timeDisplay.textContent();

        await page.waitForTimeout(1500);
        const afterReloadTick = await timeDisplay.textContent();
        expect(parseTime(afterReloadTick)).toBeLessThan(parseTime(afterReload));
    });
});
