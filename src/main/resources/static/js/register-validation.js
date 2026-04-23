document.addEventListener("DOMContentLoaded", () => {
    const MIN_PASSWORD_LENGTH = 8;
    const MAX_PASSWORD_LENGTH = 64;
    const USERNAME_MESSAGE = "Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens";
    const INVALID_EMAIL_MESSAGE = "Email must be valid";
    const EMAIL_MESSAGE = "Use English letters only in the domain after @, for example: gmail.com";
    const PASSWORD_MESSAGE = `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters and include uppercase, lowercase, and a number`;
    const FORBIDDEN_VALUE_MESSAGE = "67 and six seven are not allowed here";
    const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@(?:(?!xn--)[A-Za-z0-9-]+\.)+(?:(?!xn--)[A-Za-z0-9-]+)$/i;
    const form = document.querySelector("#registerForm");

    if (!form) return;

    const usernameInput = document.querySelector("#registerUsername");
    const emailInput = document.querySelector("#registerEmail");
    const passwordInput = document.querySelector("#registerPassword");
    const confirmPasswordInput = document.querySelector("#registerConfirmPassword");
    const formMessage = document.querySelector("[data-form-message]");
    const passwordRules = document.querySelector("#passwordRules");
    const passwordRuleItems = {
        length: document.querySelector('[data-password-rule="length"]'),
        max: document.querySelector('[data-password-rule="max"]'),
        lowercase: document.querySelector('[data-password-rule="lowercase"]'),
        uppercase: document.querySelector('[data-password-rule="uppercase"]'),
        number: document.querySelector('[data-password-rule="number"]')
    };

    const usernameError = document.querySelector('[data-error-for="registerUsername"]');
    const emailError = document.querySelector('[data-error-for="registerEmail"]');
    const passwordError = document.querySelector('[data-error-for="registerPassword"]');
    const confirmPasswordError = document.querySelector('[data-error-for="registerConfirmPassword"]');

    function hasLowercaseLetter(value) {
        return /\p{Ll}/u.test(value);
    }

    function hasUppercaseLetter(value) {
        return /\p{Lu}/u.test(value);
    }

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

    function isValidEmail(value) {
        return EMAIL_REGEX.test(value);
    }

    function isValidPassword(value) {
        return value.length >= MIN_PASSWORD_LENGTH
            && value.length <= MAX_PASSWORD_LENGTH
            && hasLowercaseLetter(value)
            && hasUppercaseLetter(value)
            && /\d/.test(value);
    }

    function getPasswordRuleState(value) {
        return {
            length: value.length >= MIN_PASSWORD_LENGTH,
            max: value.length <= MAX_PASSWORD_LENGTH,
            lowercase: hasLowercaseLetter(value),
            uppercase: hasUppercaseLetter(value),
            number: /\d/.test(value)
        };
    }

    function updatePasswordRules() {
        if (!passwordRules) return;

        const password = passwordInput?.value || "";
        passwordRules.classList.toggle("hidden", password.length === 0);

        const ruleState = getPasswordRuleState(password);
        Object.entries(passwordRuleItems).forEach(([rule, item]) => {
            if (!item) return;

            item.classList.toggle("password-rule--valid", ruleState[rule]);
            item.classList.toggle("password-rule--invalid", !ruleState[rule]);
        });
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
            showFieldError(emailInput, emailError, INVALID_EMAIL_MESSAGE);
            isValid = false;
        } else if (!isValidEmail(email)) {
            showFieldError(emailInput, emailError, EMAIL_MESSAGE);
            isValid = false;
        }

        if (!password) {
            showFieldError(passwordInput, passwordError, "Password cannot be empty");
            isValid = false;
        } else if (!isValidPassword(password)) {
            showFieldError(passwordInput, passwordError, PASSWORD_MESSAGE);
            isValid = false;
        }
        updatePasswordRules();

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
                updatePasswordRules();
            }
            if (input === confirmPasswordInput) clearFieldError(confirmPasswordInput, confirmPasswordError);
            clearFormMessage();
        });
    });

    form.addEventListener("submit", event => {
        if (!validateForm()) {
            event.preventDefault();
        }
    });

    updatePasswordRules();
});
