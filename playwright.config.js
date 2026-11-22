const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
    testDir: ".",
    testMatch: ["tests/e2e/**/*.spec.js"],
    testIgnore: ["tests/unit-js/**"],
    timeout: 30_000,
    fullyParallel: true,
    outputDir: "test-results",
    reporter: process.env.CI ? [["line"]] : [["list"]],
    expect: {
        timeout: 5_000
    },
    use: {
        trace: "retain-on-failure"
    }
});
