const { test, expect } = require("@playwright/test");

const baseUrl = process.env.E2E_DEV_BASE_URL || process.env.E2E_BASE_URL || "https://teclos.space";

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function attachConsoleTracking(page) {
    const criticalMessages = [];

    page.on("console", message => {
        if (message.type() === "error") {
            const text = message.text();
            const isExpectedAnonymousSettings401 =
                text.includes("Failed to load resource: the server responded with a status of 401");

            if (!isExpectedAnonymousSettings401) {
                criticalMessages.push(`console.error: ${text}`);
            }
        }
    });

    page.on("pageerror", error => {
        criticalMessages.push(`pageerror: ${error.message}`);
    });

    return criticalMessages;
}

async function expectNoCriticalBrowserErrors(messages, pageName) {
    expect(
        messages,
        `${pageName} should not emit critical browser console errors during smoke navigation`
    ).toEqual([]);
}

async function expectLayoutIsStable(page, selectors, pageName) {
    for (const selector of selectors) {
        await expect(page.locator(selector), `${pageName} should render ${selector}`).toBeVisible();
    }

    const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
    });

    expect(hasHorizontalOverflow, `${pageName} should not have obvious horizontal layout break`).toBe(false);
}

test.describe("dev deployment smoke", () => {
    test("home page is available and renders timer UI without critical browser errors", async ({ page }) => {
        const criticalMessages = attachConsoleTracking(page);

        await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(new RegExp(`${escapeRegExp(baseUrl)}/?$`));

        await expectLayoutIsStable(
            page,
            [
                ".page-title",
                "#timerSection",
                ".timer-modes",
                "#timeDisplay",
                "#startBtn",
                "#resetBtn",
                "#settingsToggle"
            ],
            "Home page"
        );

        await expectNoCriticalBrowserErrors(criticalMessages, "Home page");
    });

    test("productivity page is available and renders its primary UI without critical browser errors", async ({ page }) => {
        const criticalMessages = attachConsoleTracking(page);

        await page.goto(`${baseUrl}/productivity`, { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(new RegExp(`${escapeRegExp(baseUrl)}/productivity/?$`));

        await expectLayoutIsStable(page, [".productivity-title"], "Productivity page");

        const hasTabbedUi = await page.locator(".productivity-tabs").count();
        const hasGuestCard = await page.locator(".productivity-guest-card").count();

        expect(
            hasTabbedUi > 0 || hasGuestCard > 0,
            "Productivity page should render either the tabbed workspace or the guest login-required card"
        ).toBe(true);

        if (hasTabbedUi > 0) {
            await expectLayoutIsStable(
                page,
                [
                    ".productivity-tabs",
                    "#productivity-tab-todo",
                    "#productivity-tab-notes",
                    '[data-tab-panel="todo"]'
                ],
                "Productivity page"
            );

            await expect(page.locator("#productivity-tab-todo")).toHaveAttribute("aria-selected", "true");
            await expect(page.locator('[data-tab-panel="todo"]')).toHaveAttribute("aria-hidden", "false");
        } else {
            await expectLayoutIsStable(
                page,
                [
                    ".productivity-guest-card",
                    ".productivity-guest-title",
                    ".productivity-guest-button"
                ],
                "Productivity page"
            );
        }

        await expectNoCriticalBrowserErrors(criticalMessages, "Productivity page");
    });

    test("login page is available and renders auth UI without critical browser errors", async ({ page }) => {
        const criticalMessages = attachConsoleTracking(page);

        await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(new RegExp(`${escapeRegExp(baseUrl)}/login(?:\\?.*)?$`));

        await expectLayoutIsStable(
            page,
            [
                ".auth-title",
                "#loginForm",
                "#loginIdentifier",
                "#loginPassword",
                ".auth-submit"
            ],
            "Login page"
        );

        await expectNoCriticalBrowserErrors(criticalMessages, "Login page");
    });
});
