document.addEventListener("DOMContentLoaded", () => {
    const MIN_PASSWORD_LENGTH = 8;
    const usernameForm = document.querySelector("#username-form");
    const passwordForm = document.querySelector("#password-form");
    const csrfToken = document.querySelector('meta[name="_csrf"]')?.content;
    const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content;

    const usernameInput = document.querySelector("#username");
    const oldPasswordInput = document.querySelector("#oldPassword");
    const newPasswordInput = document.querySelector("#newPassword");
    const confirmNewPasswordInput = document.querySelector("#confirmNewPassword");

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

    function validateUsername() {
        const username = usernameInput.value.trim();
        clearFieldError(usernameInput, usernameError);

        if (!username) {
            showFieldError(usernameInput, usernameError, "Username cannot be empty");
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
        }

        if (!confirmNewPassword) {
            showFieldError(confirmNewPasswordInput, confirmNewPasswordError, "Confirm password is required");
            isValid = false;
        } else if (newPassword && confirmNewPassword !== newPassword) {
            showFieldError(confirmNewPasswordInput, confirmNewPasswordError, "Passwords do not match");
            isValid = false;
        }

        return isValid;
    }

    usernameInput?.addEventListener("input", () => {
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
            }
            if (input === confirmNewPasswordInput) {
                clearFieldError(confirmNewPasswordInput, confirmNewPasswordError);
            }

            clearMessage(passwordMessage);
        });
    });

    if (usernameForm) {
        usernameForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const username = usernameInput.value.trim();
            clearMessage(usernameMessage);

            if (!validateUsername()) {
                showMessage(usernameMessage, "Username cannot be empty", false);
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
                showMessage(passwordMessage, "Fix the highlighted password fields", false);
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
});
