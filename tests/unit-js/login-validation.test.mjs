import assert from "node:assert/strict";
import test from "node:test";

import {
    createDocument,
    createElement,
    runBrowserScript
} from "./dom-test-utils.mjs";

function bootstrapLoginPage() {
    const form = createElement({
        tagName: "form",
        id: "loginForm",
        dataset: { authForm: "login" }
    });
    const identifierInput = createElement({
        tagName: "input",
        id: "loginIdentifier",
        name: "username",
        classNames: ["settings-input", "auth-input"]
    });
    const identifierError = createElement({
        tagName: "p",
        dataset: { errorFor: "loginIdentifier" },
        classNames: ["form-field-error", "hidden"]
    });
    const passwordInput = createElement({
        tagName: "input",
        id: "loginPassword",
        name: "password",
        classNames: ["settings-input", "auth-input"]
    });
    const passwordError = createElement({
        tagName: "p",
        dataset: { errorFor: "loginPassword" },
        classNames: ["form-field-error", "hidden"]
    });
    const formMessage = createElement({
        tagName: "p",
        dataset: { formMessage: "" },
        classNames: ["form-message", "hidden"]
    });
    const submitButton = createElement({
        tagName: "button",
        classNames: ["btn", "btn--primary", "auth-submit"]
    });

    form.appendChild(identifierInput);
    form.appendChild(identifierError);
    form.appendChild(passwordInput);
    form.appendChild(passwordError);
    form.appendChild(formMessage);
    form.appendChild(submitButton);

    const document = createDocument([form]);
    const context = {
        document,
        window: null,
        console: {
            warn() {},
            log() {},
            error() {}
        }
    };
    context.window = context;

    runBrowserScript("src/main/resources/static/js/login-validation.js", context);
    document.dispatchEvent({ type: "DOMContentLoaded", target: document });

    return {
        form,
        identifierInput,
        identifierError,
        passwordInput,
        passwordError,
        formMessage,
        submitButton
    };
}

test("login page renders the expected form structure and keeps submit disabled until fields are filled", () => {
    const runtime = bootstrapLoginPage();

    assert.ok(runtime.form);
    assert.ok(runtime.identifierInput);
    assert.ok(runtime.passwordInput);
    assert.ok(runtime.submitButton);
    assert.equal(runtime.submitButton.disabled, true);
    assert.equal(runtime.submitButton.getAttribute("aria-disabled"), "true");

    runtime.identifierInput.value = "demo-user";
    runtime.identifierInput.dispatchEvent({ type: "input", target: runtime.identifierInput });
    assert.equal(runtime.submitButton.disabled, true);

    runtime.passwordInput.value = "secret123";
    runtime.passwordInput.dispatchEvent({ type: "input", target: runtime.passwordInput });
    assert.equal(runtime.submitButton.disabled, false);
    assert.equal(runtime.submitButton.getAttribute("aria-disabled"), "false");
});

test("login validation blocks empty submit and shows field-level error state", () => {
    const runtime = bootstrapLoginPage();

    const submitEvent = {
        type: "submit",
        target: runtime.form
    };
    runtime.form.dispatchEvent(submitEvent);

    assert.equal(submitEvent.defaultPrevented, true);
    assert.equal(runtime.identifierInput.getAttribute("aria-invalid"), "true");
    assert.equal(runtime.passwordInput.getAttribute("aria-invalid"), "true");
    assert.equal(runtime.identifierError.classList.contains("hidden"), false);
    assert.equal(runtime.passwordError.classList.contains("hidden"), false);
    assert.equal(runtime.formMessage.classList.contains("hidden"), false);
    assert.ok(runtime.formMessage.textContent.includes("Fill in both required fields"));
});

test("valid login input clears error state and passes frontend validation without auth integration", () => {
    const runtime = bootstrapLoginPage();

    runtime.identifierInput.value = "user@test.com";
    runtime.passwordInput.value = "valid-password";
    runtime.identifierInput.dispatchEvent({ type: "input", target: runtime.identifierInput });
    runtime.passwordInput.dispatchEvent({ type: "input", target: runtime.passwordInput });

    const submitEvent = {
        type: "submit",
        target: runtime.form
    };
    runtime.form.dispatchEvent(submitEvent);

    assert.equal(submitEvent.defaultPrevented, false);
    assert.equal(runtime.identifierInput.getAttribute("aria-invalid"), null);
    assert.equal(runtime.passwordInput.getAttribute("aria-invalid"), null);
    assert.equal(runtime.identifierError.classList.contains("hidden"), true);
    assert.equal(runtime.passwordError.classList.contains("hidden"), true);
});

test("[ui-negative] whitespace-only login input stays disabled and shows required-field errors on submit", () => {
    const runtime = bootstrapLoginPage();

    runtime.identifierInput.value = "   ";
    runtime.passwordInput.value = "   ";
    runtime.identifierInput.dispatchEvent({ type: "input", target: runtime.identifierInput });
    runtime.passwordInput.dispatchEvent({ type: "input", target: runtime.passwordInput });

    assert.equal(runtime.submitButton.disabled, true);

    const submitEvent = {
        type: "submit",
        target: runtime.form
    };
    runtime.form.dispatchEvent(submitEvent);

    assert.equal(submitEvent.defaultPrevented, true);
    assert.equal(runtime.identifierError.textContent, "Email or username is required");
    assert.equal(runtime.passwordError.textContent, "Password is required");
});

test("[ui-negative] missing identifier keeps submit disabled and only marks the identifier field invalid", () => {
    const runtime = bootstrapLoginPage();

    runtime.identifierInput.value = "   ";
    runtime.passwordInput.value = "valid-password";
    runtime.identifierInput.dispatchEvent({ type: "input", target: runtime.identifierInput });
    runtime.passwordInput.dispatchEvent({ type: "input", target: runtime.passwordInput });

    assert.equal(runtime.submitButton.disabled, true);

    const submitEvent = {
        type: "submit",
        target: runtime.form
    };
    runtime.form.dispatchEvent(submitEvent);

    assert.equal(submitEvent.defaultPrevented, true);
    assert.equal(runtime.identifierError.textContent, "Email or username is required");
    assert.equal(runtime.passwordError.classList.contains("hidden"), true);
});

test("[ui-negative] missing password keeps submit disabled and only marks the password field invalid", () => {
    const runtime = bootstrapLoginPage();

    runtime.identifierInput.value = "user@test.com";
    runtime.passwordInput.value = "   ";
    runtime.identifierInput.dispatchEvent({ type: "input", target: runtime.identifierInput });
    runtime.passwordInput.dispatchEvent({ type: "input", target: runtime.passwordInput });

    assert.equal(runtime.submitButton.disabled, true);

    const submitEvent = {
        type: "submit",
        target: runtime.form
    };
    runtime.form.dispatchEvent(submitEvent);

    assert.equal(submitEvent.defaultPrevented, true);
    assert.equal(runtime.identifierError.classList.contains("hidden"), true);
    assert.equal(runtime.passwordError.textContent, "Password is required");
});

test("[ui-negative] forbidden 67-style login identifiers are blocked client-side with a visible message", () => {
    const runtime = bootstrapLoginPage();

    runtime.identifierInput.value = " Six   Seven ";
    runtime.passwordInput.value = "valid-password";
    runtime.identifierInput.dispatchEvent({ type: "input", target: runtime.identifierInput });
    runtime.passwordInput.dispatchEvent({ type: "input", target: runtime.passwordInput });

    assert.equal(runtime.submitButton.disabled, true);
    assert.equal(runtime.identifierError.classList.contains("hidden"), false);
    assert.equal(runtime.identifierError.textContent, "67 and six seven are not allowed here.");

    const submitEvent = {
        type: "submit",
        target: runtime.form
    };
    runtime.form.dispatchEvent(submitEvent);

    assert.equal(submitEvent.defaultPrevented, true);
    assert.equal(runtime.formMessage.classList.contains("hidden"), false);
    assert.equal(runtime.formMessage.textContent, "67 and six seven are not allowed here.");
});

test("[ui-negative] correcting a forbidden login identifier clears the error and re-enables submit", () => {
    const runtime = bootstrapLoginPage();

    runtime.identifierInput.value = "67";
    runtime.passwordInput.value = "valid-password";
    runtime.identifierInput.dispatchEvent({ type: "input", target: runtime.identifierInput });
    runtime.passwordInput.dispatchEvent({ type: "input", target: runtime.passwordInput });

    assert.equal(runtime.submitButton.disabled, true);
    assert.equal(runtime.identifierError.textContent, "67 and six seven are not allowed here.");

    runtime.identifierInput.value = "pancake";
    runtime.identifierInput.dispatchEvent({ type: "input", target: runtime.identifierInput });

    assert.equal(runtime.identifierError.classList.contains("hidden"), true);
    assert.equal(runtime.submitButton.disabled, false);
    assert.equal(runtime.submitButton.getAttribute("aria-disabled"), "false");
});
