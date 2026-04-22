document.addEventListener("DOMContentLoaded", () => {
    const MIN_PASSWORD_LENGTH = 8;
    const MAX_PASSWORD_LENGTH = 64;
    const USERNAME_MESSAGE = "Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens";
    const PASSWORD_MESSAGE = `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters and include uppercase, lowercase, and a number`;
    const FORBIDDEN_VALUE_MESSAGE = "67 and six seven are not allowed here";
    const usernameForm = document.querySelector("#username-form");
    const passwordForm = document.querySelector("#password-form");
    const csrfToken = document.querySelector('meta[name="_csrf"]')?.content;
    const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content;

    const usernameInput = document.querySelector("#username");
    const oldPasswordInput = document.querySelector("#oldPassword");
    const newPasswordInput = document.querySelector("#newPassword");
    const confirmNewPasswordInput = document.querySelector("#confirmNewPassword");
    const profilePasswordRules = document.querySelector("#profilePasswordRules");
    const profilePasswordMatchRule = document.querySelector("#profilePasswordMatchRule");
    const profilePasswordRuleItems = {
        length: document.querySelector('[data-profile-password-rule="length"]'),
        max: document.querySelector('[data-profile-password-rule="max"]'),
        lowercase: document.querySelector('[data-profile-password-rule="lowercase"]'),
        uppercase: document.querySelector('[data-profile-password-rule="uppercase"]'),
        number: document.querySelector('[data-profile-password-rule="number"]'),
        match: document.querySelector('[data-profile-password-rule="match"]')
    };

    const usernameMessage = document.querySelector("#username-message");
    const passwordMessage = document.querySelector("#password-message");
    const usernameError = document.querySelector('[data-error-for="username"]');
    const oldPasswordError = document.querySelector('[data-error-for="oldPassword"]');
    const newPasswordError = document.querySelector('[data-error-for="newPassword"]');
    const confirmNewPasswordError = document.querySelector('[data-error-for="confirmNewPassword"]');

    function showFieldError(input, errorElement, message) {
        if (!input || !errorElement) return;

        input.setAttribute("aria-invalid", "true");
        input.classList.add("settings-input--invalid");
        errorElement.textContent = message;
        errorElement.classList.remove("hidden");
    }

    function clearFieldError(input, errorElement) {
        if (!input || !errorElement) return;

        input.removeAttribute("aria-invalid");
        input.classList.remove("settings-input--invalid");
        errorElement.textContent = "";
        errorElement.classList.add("hidden");
    }

    function clearMessage(element) {
        if (!element) return;

        element.textContent = "";
        element.classList.add("hidden");
        element.classList.remove("form-message--success", "form-message--error");
        element.style.color = "";
    }

    function hasForbiddenUsername(value) {
        const normalized = value.trim().replace(/\s+/g, " ").toLowerCase();
        return normalized === "67" || normalized === "six seven";
    }

    function normalizeUsername(value) {
        return value.replace(/\s+/g, "_");
    }

    function isValidUsername(value) {
        return /^[A-Za-z0-9_-]{3,30}$/.test(value);
    }

    function isValidPassword(value) {
        return value.length >= MIN_PASSWORD_LENGTH
            && value.length <= MAX_PASSWORD_LENGTH
            && /[a-z]/.test(value)
            && /[A-Z]/.test(value)
            && /\d/.test(value);
    }

    function getPasswordRuleState(value, confirmValue) {
        return {
            length: value.length >= MIN_PASSWORD_LENGTH,
            max: value.length <= MAX_PASSWORD_LENGTH,
            lowercase: /[a-z]/.test(value),
            uppercase: /[A-Z]/.test(value),
            number: /\d/.test(value),
            match: value.length > 0 && confirmValue.length > 0 && value === confirmValue
        };
    }

    function updateProfilePasswordRules() {
        if (!profilePasswordRules) return;

        const password = newPasswordInput?.value || "";
        const confirmPassword = confirmNewPasswordInput?.value || "";
        profilePasswordRules.classList.toggle("hidden", password.length === 0);
        profilePasswordMatchRule?.classList.toggle("hidden", confirmPassword.length === 0);

        const ruleState = getPasswordRuleState(password, confirmPassword);
        Object.entries(profilePasswordRuleItems).forEach(([rule, item]) => {
            if (!item) return;

            item.classList.toggle("password-rule--valid", ruleState[rule]);
            item.classList.toggle("password-rule--invalid", !ruleState[rule]);
        });
    }

    function validateUsername() {
        const username = normalizeUsername(usernameInput.value);
        usernameInput.value = username;
        clearFieldError(usernameInput, usernameError);

        if (!username) {
            showFieldError(usernameInput, usernameError, "Username cannot be empty");
            return false;
        }

        if (hasForbiddenUsername(username)) {
            showFieldError(usernameInput, usernameError, FORBIDDEN_VALUE_MESSAGE);
            return false;
        }

        if (!isValidUsername(username)) {
            showFieldError(usernameInput, usernameError, USERNAME_MESSAGE);
            return false;
        }

        return true;
    }

    function validatePasswordForm() {
        const oldPassword = oldPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;

        clearFieldError(oldPasswordInput, oldPasswordError);
        clearFieldError(newPasswordInput, newPasswordError);
        clearFieldError(confirmNewPasswordInput, confirmNewPasswordError);

        let isValid = true;

        if (!oldPassword) {
            showFieldError(oldPasswordInput, oldPasswordError, "Current password is required");
            isValid = false;
        }

        if (!newPassword) {
            showFieldError(newPasswordInput, newPasswordError, "New password is required");
            isValid = false;
        } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
            showFieldError(newPasswordInput, newPasswordError, `New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
            isValid = false;
        } else if (newPassword.length > MAX_PASSWORD_LENGTH) {
            showFieldError(newPasswordInput, newPasswordError, `New password cannot be longer than ${MAX_PASSWORD_LENGTH} characters`);
            isValid = false;
        } else if (!isValidPassword(newPassword)) {
            showFieldError(newPasswordInput, newPasswordError, PASSWORD_MESSAGE);
            isValid = false;
        }

        if (!confirmNewPassword) {
            showFieldError(confirmNewPasswordInput, confirmNewPasswordError, "Confirm password is required");
            isValid = false;
        } else if (newPassword && confirmNewPassword !== newPassword) {
            confirmNewPasswordInput.setAttribute("aria-invalid", "true");
            confirmNewPasswordInput.classList.add("settings-input--invalid");
            confirmNewPasswordError.textContent = "";
            confirmNewPasswordError.classList.add("hidden");
            isValid = false;
        }

        return isValid;
    }

    usernameInput?.addEventListener("input", () => {
        const normalizedUsername = normalizeUsername(usernameInput.value);
        if (usernameInput.value !== normalizedUsername) {
            usernameInput.value = normalizedUsername;
        }
        clearFieldError(usernameInput, usernameError);
        clearMessage(usernameMessage);
    });

    [oldPasswordInput, newPasswordInput, confirmNewPasswordInput].forEach(input => {
        input?.addEventListener("input", () => {
            if (input === oldPasswordInput) {
                clearFieldError(oldPasswordInput, oldPasswordError);
            }
            if (input === newPasswordInput) {
                clearFieldError(newPasswordInput, newPasswordError);
                clearFieldError(confirmNewPasswordInput, confirmNewPasswordError);
                updateProfilePasswordRules();
            }
            if (input === confirmNewPasswordInput) {
                clearFieldError(confirmNewPasswordInput, confirmNewPasswordError);
                updateProfilePasswordRules();
            }

            clearMessage(passwordMessage);
        });
    });

    if (usernameForm) {
        usernameForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const username = normalizeUsername(usernameInput.value);
            usernameInput.value = username;
            clearMessage(usernameMessage);

            if (!validateUsername()) {
                const validationMessage = usernameError?.textContent?.trim() || "Username cannot be empty";
                showMessage(usernameMessage, validationMessage, false);
                return;
            }

            try {
                const response = await window.fetch("/api/user/username", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        ...(csrfToken && csrfHeader ? { [csrfHeader]: csrfToken } : {})
                    },
                    body: JSON.stringify({ username })
                });

                const data = await response.json();

                if (response.ok) {
                    usernameInput.value = data.username;
                    showMessage(usernameMessage, data.message, true);
                } else {
                    showMessage(usernameMessage, data.message || "Failed to update username", false);
                }
            } catch (error) {
                console.warn("Failed to update username from profile page.", error);
                showMessage(usernameMessage, "Server error while updating username", false);
            }
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            clearMessage(passwordMessage);

            if (!validatePasswordForm()) {
                return;
            }

            const oldPassword = oldPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmNewPassword = confirmNewPasswordInput.value;

            try {
                const response = await window.fetch("/api/user/password", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        ...(csrfToken && csrfHeader ? { [csrfHeader]: csrfToken } : {})
                    },
                    body: JSON.stringify({
                        oldPassword,
                        newPassword,
                        confirmNewPassword
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage(passwordMessage, data.message, true);
                    passwordForm.reset();
                    updateProfilePasswordRules();
                } else {
                    showMessage(passwordMessage, data.message || "Failed to update password", false);
                }
            } catch (error) {
                console.warn("Failed to update password from profile page.", error);
                showMessage(passwordMessage, "Server error while updating password", false);
            }
        });
    }

    function showMessage(element, message, isSuccess) {
        if (!element) return;

        element.textContent = message;
        element.classList.remove("hidden", "form-message--success", "form-message--error");
        element.classList.add(isSuccess ? "form-message--success" : "form-message--error");
        element.style.color = isSuccess ? "#4CAF50" : "#ff4d4f";
    }

    updateProfilePasswordRules();
});
