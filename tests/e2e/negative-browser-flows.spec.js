const { test, expect } = require("@playwright/test");
const { escapeRegExp, expectVisibleOrSkip, gotoOrSkip } = require("./remote-test-utils");

const baseUrl = process.env.E2E_BASE_URL || "https://teclos.space";
const validUsername = process.env.E2E_LOGIN_USERNAME;
const validPassword = process.env.E2E_LOGIN_PASSWORD;

async function openHomeWithCleanState(page) {
    await page.addInitScript(() => {
        localStorage.removeItem("pomodoroSettings");
        localStorage.removeItem("pomodoroTimerState");
    });

    await gotoOrSkip(page, `${baseUrl}/`);
    await expectVisibleOrSkip(page.locator("#settingsToggle"), "home settings toggle");
}

async function loginWithValidCredentials(page) {
    await gotoOrSkip(page, `${baseUrl}/login`);
    await page.locator("#loginIdentifier").fill(validUsername);
    await page.locator("#loginPassword").fill(validPassword);
    await page.locator(".auth-submit").click();
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(baseUrl)}/user(?:\\?.*)?$`));
}

test.describe("negative browser flows", () => {
    test("@ui-negative home settings reject invalid numeric values", async ({ page }) => {
        await openHomeWithCleanState(page);

        await page.locator("#settingsToggle").click();
        await page.locator("#pomodoroTime").fill("");
        await page.locator("#saveSettings").click();
        await expect(page.locator("#settingsError")).toContainText("Work is required.");

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
        await gotoOrSkip(page, `${baseUrl}/login`);
        await expectVisibleOrSkip(page.locator("#loginForm"), "login form");

        await page.locator("#loginIdentifier").fill("six seven");
        await page.locator("#loginPassword").fill("valid-password");
        await expect(page.locator(".auth-submit")).toBeDisabled();
        await expect(page.locator('[data-error-for="loginIdentifier"]')).toContainText("67 and six seven are not allowed here.");
    });

    test("@ui-negative productivity rejects forbidden todo text without breaking layout", async ({ page }) => {
        await gotoOrSkip(page, `${baseUrl}/productivity`);

        const todoInput = page.locator("#todoInput");
        if (await todoInput.count() === 0) {
            test.skip(
                !validUsername || !validPassword,
                "Productivity workspace requires authentication on teclos.space. Set E2E_LOGIN_USERNAME and E2E_LOGIN_PASSWORD to run this spec."
            );

            await loginWithValidCredentials(page);
            await gotoOrSkip(page, `${baseUrl}/productivity`);
        }

        await expect(todoInput).toBeVisible();
        await todoInput.fill("67");
        await page.getByRole("button", { name: "Add task" }).click();
        await expect(page.locator('[data-form-message="todo"]')).toContainText("67 and six seven are not allowed here.");
        await expect(page.locator('[data-item-list="todo"] li')).toHaveCount(0);
        await expect(page.locator(".productivity-surface")).toBeVisible();
    });
});
