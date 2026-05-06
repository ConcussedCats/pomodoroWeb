const { test } = require("@playwright/test");

const UNAVAILABLE_NAVIGATION_ERROR = /ERR_ADDRESS_UNREACHABLE|ERR_CONNECTION_REFUSED|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_TIMED_OUT|Timeout/i;

async function gotoOrSkip(page, url, options = { waitUntil: "domcontentloaded" }) {
    try {
        return await page.goto(url, options);
    } catch (error) {
        if (process.env.E2E_REQUIRE_REMOTE === "true" || !UNAVAILABLE_NAVIGATION_ERROR.test(error.message)) {
            throw error;
        }

        const firstLine = error.message.split("\n")[0];
        test.skip(true, `Remote browser target is unavailable: ${firstLine}`);
        return null;
    }
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
    escapeRegExp,
    gotoOrSkip
};
