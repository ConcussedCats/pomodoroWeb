const { test, expect } = require("@playwright/test");

const baseUrl = process.env.E2E_BASE_URL || "https://teclos.space";

async function openHomeWithCleanState(page) {
    await page.addInitScript(() => {
        localStorage.removeItem("pomodoroSettings");
        localStorage.removeItem("pomodoroTimerState");
    });

    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
}

test.describe("negative browser flows", () => {
    test("@ui-negative home settings reject invalid numeric values", async ({ page }) => {
        test.skip(
            baseUrl.includes("teclos.space"),
            "This negative browser spec expects the latest branch assets, not the currently deployed remote build."
        );

        await openHomeWithCleanState(page);

        await page.locator("#settingsToggle").click();
        await page.locator("#pomodoroTime").fill("abc");
        await page.locator("#saveSettings").click();
        await expect(page.locator("#settingsError")).toContainText("Work must be a number.");

        await page.locator("#pomodoroTime").fill("25");
        await page.locator("#shortBreakTime").fill("2.5");
        await page.locator("#saveSettings").click();
        await expect(page.locator("#settingsError")).toContainText("Short break must be a whole number.");

        await page.locator("#shortBreakTime").fill("5");
        await page.locator("#focusCycles").fill("0");
        await page.locator("#saveSettings").click();
        await expect(page.locator("#settingsError")).toContainText("Focus session cycles must be between 1 and 12.");
    });

    test("@ui-negative login rejects forbidden 67-style identifiers client-side", async ({ page }) => {
        test.skip(
            baseUrl.includes("teclos.space"),
            "This negative browser spec expects the latest branch assets, not the currently deployed remote build."
        );

        await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });

        await page.locator("#loginIdentifier").fill("six seven");
        await page.locator("#loginPassword").fill("valid-password");
        await expect(page.locator(".auth-submit")).toBeDisabled();
        await expect(page.locator('[data-error-for="loginIdentifier"]')).toContainText("67 and six seven are not allowed here.");
    });

    test("@ui-negative productivity rejects forbidden todo text without breaking layout", async ({ page }) => {
        test.skip(
            baseUrl.includes("teclos.space"),
            "This negative browser spec expects the latest branch assets, not the currently deployed remote build."
        );

        await page.goto(`${baseUrl}/productivity`, { waitUntil: "domcontentloaded" });

        await page.locator("#todoInput").fill("67");
        await page.getByRole("button", { name: "Add task" }).click();
        await expect(page.locator('[data-form-message="todo"]')).toContainText("67 and six seven are not allowed here.");
        await expect(page.locator('[data-item-list="todo"] li')).toHaveCount(0);
        await expect(page.locator(".productivity-surface")).toBeVisible();
    });
});
