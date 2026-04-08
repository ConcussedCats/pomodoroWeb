import assert from "node:assert/strict";
import test from "node:test";

import {
    createDocument,
    createElement,
    runBrowserScript
} from "./dom-test-utils.mjs";

async function flushAsyncWork() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
}

function createFetchRecorder() {
    const calls = [];

    return {
        calls,
        fetch: async (url, options = {}) => {
            calls.push({ url, options });
            return {
                ok: true,
                async json() {
                    if (url.includes("/username")) {
                        const body = JSON.parse(options.body);
                        return {
                            username: body.username,
                            message: "Username updated"
                        };
                    }

                    return {
                        message: "Password updated"
                    };
                }
            };
        }
    };
}

function bootstrapUserProfilePage() {
    const usernameForm = createElement({ tagName: "form", id: "username-form" });
    const usernameTitle = createElement({ tagName: "h3", classNames: ["profile-panel-title"], content: "Profile Data" });
    const usernameInput = createElement({ tagName: "input", id: "username", name: "username", value: "demo-user", classNames: ["settings-input", "auth-input"] });
    const usernameError = createElement({ tagName: "p", dataset: { errorFor: "username" }, classNames: ["form-field-error", "hidden"] });
    const usernameMessage = createElement({ tagName: "p", id: "username-message", classNames: ["form-message", "hidden"] });
    const usernameSubmit = createElement({ tagName: "button", classNames: ["auth-submit"] });
    usernameForm.appendChild(usernameTitle);
    usernameForm.appendChild(usernameInput);
    usernameForm.appendChild(usernameError);
    usernameForm.appendChild(usernameMessage);
    usernameForm.appendChild(usernameSubmit);

    const passwordForm = createElement({ tagName: "form", id: "password-form" });
    const passwordTitle = createElement({ tagName: "h3", classNames: ["profile-panel-title"], content: "Change Password" });
    const oldPasswordInput = createElement({ tagName: "input", id: "oldPassword", name: "oldPassword", classNames: ["settings-input", "auth-input"] });
    const oldPasswordError = createElement({ tagName: "p", dataset: { errorFor: "oldPassword" }, classNames: ["form-field-error", "hidden"] });
    const newPasswordInput = createElement({ tagName: "input", id: "newPassword", name: "newPassword", classNames: ["settings-input", "auth-input"] });
    const newPasswordError = createElement({ tagName: "p", dataset: { errorFor: "newPassword" }, classNames: ["form-field-error", "hidden"] });
    const confirmNewPasswordInput = createElement({ tagName: "input", id: "confirmNewPassword", name: "confirmNewPassword", classNames: ["settings-input", "auth-input"] });
    const confirmNewPasswordError = createElement({ tagName: "p", dataset: { errorFor: "confirmNewPassword" }, classNames: ["form-field-error", "hidden"] });
    const passwordMessage = createElement({ tagName: "p", id: "password-message", classNames: ["form-message", "hidden"] });
    const passwordSubmit = createElement({ tagName: "button", classNames: ["auth-submit"] });
    passwordForm.appendChild(passwordTitle);
    passwordForm.appendChild(oldPasswordInput);
    passwordForm.appendChild(oldPasswordError);
    passwordForm.appendChild(newPasswordInput);
    passwordForm.appendChild(newPasswordError);
    passwordForm.appendChild(confirmNewPasswordInput);
    passwordForm.appendChild(confirmNewPasswordError);
    passwordForm.appendChild(passwordMessage);
    passwordForm.appendChild(passwordSubmit);

    const csrfTokenMeta = createElement({ tagName: "meta", attributes: { name: "_csrf", content: "csrf-token" } });
    const csrfHeaderMeta = createElement({ tagName: "meta", attributes: { name: "_csrf_header", content: "X-CSRF-TOKEN" } });

    const document = createDocument([
        csrfTokenMeta,
        csrfHeaderMeta,
        usernameForm,
        passwordForm
    ]);
    const fetchRecorder = createFetchRecorder();
    const context = {
        document,
        window: null,
        fetch: fetchRecorder.fetch,
        JSON,
        Date,
        Math,
        Number,
        String,
        Boolean,
        Object,
        Array,
        console: {
            warn() {},
            log() {},
            error() {}
        }
    };
    context.window = context;

    runBrowserScript("src/main/resources/static/js/user-settings.js", context);
    document.dispatchEvent({ type: "DOMContentLoaded", target: document });

    return {
        fetchCalls: fetchRecorder.calls,
        usernameForm,
        usernameInput,
        usernameError,
        usernameMessage,
        passwordForm,
        oldPasswordInput,
        oldPasswordError,
        newPasswordInput,
        newPasswordError,
        confirmNewPasswordInput,
        confirmNewPasswordError,
        passwordMessage,
        usernameTitle,
        passwordTitle
    };
}

test("profile page exposes separate profile data and change password sections", () => {
    const runtime = bootstrapUserProfilePage();

    assert.ok(runtime.usernameForm);
    assert.ok(runtime.passwordForm);
    assert.equal(runtime.usernameTitle.textContent, "Profile Data");
    assert.equal(runtime.passwordTitle.textContent, "Change Password");
});

test("password validation blocks mismatched confirmation and short passwords with error state", () => {
    const runtime = bootstrapUserProfilePage();

    runtime.oldPasswordInput.value = "current-password";
    runtime.newPasswordInput.value = "short";
    runtime.confirmNewPasswordInput.value = "different";

    const submitEvent = {
        type: "submit",
        target: runtime.passwordForm
    };
    runtime.passwordForm.dispatchEvent(submitEvent);

    assert.equal(submitEvent.defaultPrevented, true);
    assert.equal(runtime.newPasswordInput.getAttribute("aria-invalid"), "true");
    assert.equal(runtime.confirmNewPasswordInput.getAttribute("aria-invalid"), "true");
    assert.equal(runtime.newPasswordError.classList.contains("hidden"), false);
    assert.equal(runtime.confirmNewPasswordError.classList.contains("hidden"), false);
    assert.ok(runtime.newPasswordError.textContent.includes("at least 8"));
    assert.ok(runtime.confirmNewPasswordError.textContent.includes("do not match"));
    assert.equal(runtime.fetchCalls.length, 0);
});

test("valid password data passes frontend validation and submits without backend auth integration", async () => {
    const runtime = bootstrapUserProfilePage();

    runtime.oldPasswordInput.value = "current-password";
    runtime.newPasswordInput.value = "long-enough-password";
    runtime.confirmNewPasswordInput.value = "long-enough-password";

    const submitEvent = {
        type: "submit",
        target: runtime.passwordForm
    };
    runtime.passwordForm.dispatchEvent(submitEvent);
    await flushAsyncWork();

    assert.equal(runtime.fetchCalls.length, 1);
    assert.equal(runtime.fetchCalls[0].url, "/api/user/password");
    assert.equal(runtime.passwordMessage.classList.contains("hidden"), false);
    assert.equal(runtime.passwordMessage.classList.contains("form-message--success"), true);
    assert.equal(runtime.oldPasswordInput.value, "");
    assert.equal(runtime.newPasswordInput.value, "");
    assert.equal(runtime.confirmNewPasswordInput.value, "");
});

test("blank username is blocked client-side and valid username submission succeeds", async () => {
    const runtime = bootstrapUserProfilePage();

    runtime.usernameInput.value = "   ";
    let submitEvent = {
        type: "submit",
        target: runtime.usernameForm
    };
    runtime.usernameForm.dispatchEvent(submitEvent);
    await flushAsyncWork();

    assert.equal(runtime.fetchCalls.length, 0);
    assert.equal(runtime.usernameInput.getAttribute("aria-invalid"), "true");
    assert.equal(runtime.usernameError.classList.contains("hidden"), false);

    runtime.usernameInput.value = "updated-user";
    runtime.usernameInput.dispatchEvent({ type: "input", target: runtime.usernameInput });
    submitEvent = {
        type: "submit",
        target: runtime.usernameForm
    };
    runtime.usernameForm.dispatchEvent(submitEvent);
    await flushAsyncWork();

    assert.equal(runtime.fetchCalls.length, 1);
    assert.equal(runtime.fetchCalls[0].url, "/api/user/username");
    assert.equal(runtime.usernameMessage.classList.contains("hidden"), false);
    assert.equal(runtime.usernameMessage.classList.contains("form-message--success"), true);
    assert.equal(runtime.usernameInput.value, "updated-user");
});
