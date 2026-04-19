document.addEventListener("DOMContentLoaded", () => {
    const USERNAME_MESSAGE = "Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens";
    const PASSWORD_MESSAGE = "Password must be at least 8 characters and include uppercase, lowercase, and a number";
    const FORBIDDEN_VALUE_MESSAGE = "67 and six seven are not allowed here";
    const form = document.querySelector("#registerForm");

    if (!form) return;

    const usernameInput = document.querySelector("#registerUsername");
    const emailInput = document.querySelector("#registerEmail");
    const passwordInput = document.querySelector("#registerPassword");
    const confirmPasswordInput = document.querySelector("#registerConfirmPassword");
    const formMessage = document.querySelector("[data-form-message]");

    const usernameError = document.querySelector('[data-error-for="registerUsername"]');
    const emailError = document.querySelector('[data-error-for="registerEmail"]');
    const passwordError = document.querySelector('[data-error-for="registerPassword"]');
    const confirmPasswordError = document.querySelector('[data-error-for="registerConfirmPassword"]');

    function normalizeUsername(value) {
        return value.replace(/\s+/g, "_");
    }

    function hasForbiddenValue(value) {
        const normalized = value.trim().replace(/\s+/g, " ").toLowerCase();
        return normalized === "67" || normalized === "six seven";
    }

    function isValidUsername(value) {
        return /^[A-Za-z0-9_-]{3,30}$/.test(value);
    }

    function isValidPassword(value) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
    }

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

    function showFormMessage(message) {
        if (!formMessage) return;

        formMessage.textContent = message;
        formMessage.classList.remove("hidden");
        formMessage.classList.add("form-message--error");
    }

    function clearFormMessage() {
        if (!formMessage) return;

        formMessage.textContent = "";
        formMessage.classList.add("hidden");
        formMessage.classList.remove("form-message--error");
    }

    function normalizeUsernameInput() {
        if (!usernameInput) return;

        const normalized = normalizeUsername(usernameInput.value);
        if (usernameInput.value !== normalized) {
            usernameInput.value = normalized;
        }
    }

    function validateForm() {
        let isValid = true;
        clearFormMessage();
        normalizeUsernameInput();

        const username = usernameInput?.value || "";
        const email = emailInput?.value.trim() || "";
        const password = passwordInput?.value || "";
        const confirmPassword = confirmPasswordInput?.value || "";

        clearFieldError(usernameInput, usernameError);
        clearFieldError(emailInput, emailError);
        clearFieldError(passwordInput, passwordError);
        clearFieldError(confirmPasswordInput, confirmPasswordError);

        if (!username) {
            showFieldError(usernameInput, usernameError, "Username cannot be empty");
            isValid = false;
        } else if (hasForbiddenValue(username)) {
            showFieldError(usernameInput, usernameError, FORBIDDEN_VALUE_MESSAGE);
            isValid = false;
        } else if (!isValidUsername(username)) {
            showFieldError(usernameInput, usernameError, USERNAME_MESSAGE);
            isValid = false;
        }

        if (!email) {
            showFieldError(emailInput, emailError, "Email cannot be empty");
            isValid = false;
        } else if (!emailInput.checkValidity()) {
            showFieldError(emailInput, emailError, "Email must be valid");
            isValid = false;
        }

        if (!password) {
            showFieldError(passwordInput, passwordError, "Password cannot be empty");
            isValid = false;
        } else if (!isValidPassword(password)) {
            showFieldError(passwordInput, passwordError, PASSWORD_MESSAGE);
            isValid = false;
        }

        if (!confirmPassword) {
            showFieldError(confirmPasswordInput, confirmPasswordError, "Confirm password cannot be empty");
            isValid = false;
        } else if (password && confirmPassword !== password) {
            showFieldError(confirmPasswordInput, confirmPasswordError, "Passwords do not match");
            isValid = false;
        }

        return isValid;
    }

    usernameInput?.addEventListener("input", () => {
        normalizeUsernameInput();
        clearFieldError(usernameInput, usernameError);
        clearFormMessage();
    });

    [emailInput, passwordInput, confirmPasswordInput].forEach(input => {
        input?.addEventListener("input", () => {
            if (input === emailInput) clearFieldError(emailInput, emailError);
            if (input === passwordInput) {
                clearFieldError(passwordInput, passwordError);
                clearFieldError(confirmPasswordInput, confirmPasswordError);
            }
            if (input === confirmPasswordInput) clearFieldError(confirmPasswordInput, confirmPasswordError);
            clearFormMessage();
        });
    });

    form.addEventListener("submit", event => {
        if (!validateForm()) {
            event.preventDefault();
            showFormMessage("Fix the highlighted fields before creating your account.");
        }
    });
});
