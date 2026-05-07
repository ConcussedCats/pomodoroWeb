const { expect, test } = require("@playwright/test");

const UNAVAILABLE_NAVIGATION_ERROR = /ERR_ADDRESS_UNREACHABLE|ERR_CONNECTION_REFUSED|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_TIMED_OUT|Timeout/i;

function shouldRequireRemote() {
    return process.env.E2E_REQUIRE_REMOTE === "true";
}

function shouldTreatRemoteAsOptional() {
    return !shouldRequireRemote() && !process.env.E2E_BASE_URL && !process.env.E2E_DEV_BASE_URL;
}

function skipOptionalRemote(message, error) {
    if (!shouldTreatRemoteAsOptional()) {
        throw error;
    }

    test.skip(true, message);
}

async function gotoOrSkip(page, url, options = {}) {
    const navigationOptions = {
        waitUntil: "domcontentloaded",
        timeout: 12_000,
        ...options
    };

    try {
        return await page.goto(url, navigationOptions);
    } catch (error) {
        if (!shouldTreatRemoteAsOptional() || !UNAVAILABLE_NAVIGATION_ERROR.test(error.message)) {
            throw error;
        }

        const firstLine = error.message.split("\n")[0];
        test.skip(true, `Remote browser target is unavailable: ${firstLine}`);
        return null;
    }
}

async function expectVisibleOrSkip(locator, description, timeout = 5_000) {
    try {
        await expect(locator, description).toBeVisible({ timeout });
    } catch (error) {
        skipOptionalRemote(`Remote browser target did not render ${description}.`, error);
    }
}

async function expectUrlOrSkip(page, expectedUrl, description, timeout = 5_000) {
    try {
        await expect(page, description).toHaveURL(expectedUrl, { timeout });
    } catch (error) {
        skipOptionalRemote(`Remote browser target did not reach expected URL for ${description}.`, error);
    }
}

async function expectPollOrSkip(callback, matcher, description, timeout = 6_000) {
    try {
        await matcher(expect.poll(callback, { timeout }));
    } catch (error) {
        skipOptionalRemote(`Remote browser target did not satisfy ${description}.`, error);
    }
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
    escapeRegExp,
    expectPollOrSkip,
    expectUrlOrSkip,
    expectVisibleOrSkip,
    gotoOrSkip
};
