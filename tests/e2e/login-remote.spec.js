const { test, expect } = require("@playwright/test");
const { escapeRegExp, gotoOrSkip } = require("./remote-test-utils");

const baseUrl = process.env.E2E_BASE_URL || "https://teclos.space";
const validUsername = process.env.E2E_LOGIN_USERNAME;
const validPassword = process.env.E2E_LOGIN_PASSWORD;

async function openLoginPage(page) {
    await gotoOrSkip(page, `${baseUrl}/login`);
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(baseUrl)}/login(?:\\?.*)?$`));
}

test.describe("teclos.space login smoke", () => {
    test("login page renders expected server-side form contract", async ({ page }) => {
        await openLoginPage(page);

        const form = page.locator("#loginForm");
        const identifierInput = page.locator("#loginIdentifier");
        const passwordInput = page.locator("#loginPassword");
        const submitButton = page.locator(".auth-submit");

        await expect(form).toBeVisible();
        await expect(identifierInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(form.locator('input[name="username"]')).toHaveCount(1);
        await expect(form.locator('input[name="password"]')).toHaveCount(1);
        await expect(form.locator('input[type="hidden"][name="_csrf"]').first()).toHaveAttribute("value", /.+/);
        await expect(submitButton).toBeVisible();
        await expect(submitButton).toBeDisabled();
    });

    test("client-side login validation runs when login-validation.js is deployed", async ({ page }) => {
        await openLoginPage(page);

        const hasLoginValidationScript = await page.evaluate(() =>
            Array.from(document.scripts).some(script => script.src.includes("login-validation"))
        );

        test.skip(!hasLoginValidationScript, "login-validation.js is not deployed on teclos.space yet.");

        const form = page.locator("#loginForm");
        const identifierError = page.locator('[data-error-for="loginIdentifier"]');
        const passwordError = page.locator('[data-error-for="loginPassword"]');
        const formMessage = page.locator("[data-form-message]");
        const submitButton = page.locator(".auth-submit");

        await expect(submitButton).toBeDisabled();
        await form.evaluate(formElement => formElement.requestSubmit());
        await expect(identifierError).toContainText("Email or username is required");
        await expect(passwordError).toContainText("Password is required");
        await expect(formMessage).toContainText("Fill in both required fields before continuing.");
    });

    test("non-empty invalid credentials still submit to the server and stay in login flow", async ({ page }) => {
        await openLoginPage(page);

        const identifierInput = page.locator("#loginIdentifier");
        const passwordInput = page.locator("#loginPassword");
        const submitButton = page.locator(".auth-submit");

        await identifierInput.fill("invalid-user");
        await passwordInput.fill("invalid-password");
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        await expect(page).toHaveURL(new RegExp(`${escapeRegExp(baseUrl)}/login\\?error(?:=.*)?$`));
        await expect(page.locator("#loginForm")).toBeVisible();
    });

    test("anonymous user is redirected to login from the protected user page", async ({ page }) => {
        await gotoOrSkip(page, `${baseUrl}/user`);

        await expect(page).toHaveURL(new RegExp(`${escapeRegExp(baseUrl)}/login(?:\\?.*)?$`));
        await expect(page.locator("#loginForm")).toBeVisible();
    });

    test("valid credentials can still complete the login flow when credentials are provided", async ({ page }) => {
        test.skip(!validUsername || !validPassword, "Set E2E_LOGIN_USERNAME and E2E_LOGIN_PASSWORD to run the successful-login smoke.");

        await openLoginPage(page);

        await page.locator("#loginIdentifier").fill(validUsername);
        await page.locator("#loginPassword").fill(validPassword);
        await page.locator(".auth-submit").click();

        await expect(page).toHaveURL(new RegExp(`${escapeRegExp(baseUrl)}/user(?:\\?.*)?$`));
    });
});
