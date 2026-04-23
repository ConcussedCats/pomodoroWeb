document.addEventListener("DOMContentLoaded", () => {
    const FORBIDDEN_VALUE_MESSAGE = "67 and six seven are not allowed here.";
    const form = document.querySelector("#loginForm");
    const identifierInput = document.querySelector("#loginIdentifier");
    const passwordInput = document.querySelector("#loginPassword");
    const submitButton = form?.querySelector(".auth-submit");
    const formMessage = document.querySelector("[data-form-message]");
    const identifierError = document.querySelector('[data-error-for="loginIdentifier"]');
    const passwordError = document.querySelector('[data-error-for="loginPassword"]');

    if (!form || !identifierInput || !passwordInput || !submitButton) return;

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

    function hasForbiddenIdentifier(value) {
        const normalized = value.trim().replace(/\s+/g, " ").toLowerCase();
        return normalized === "67" || normalized === "six seven";
    }

    function clearFormMessage() {
        if (!formMessage) return;

        formMessage.textContent = "";
        formMessage.classList.add("hidden");
        formMessage.classList.remove("form-message--error");
    }

    function updateSubmitState() {
        const hasIdentifier = Boolean(identifierInput.value.trim());
        const hasPassword = Boolean(passwordInput.value.trim());
        const hasForbiddenIdentifierValue = hasForbiddenIdentifier(identifierInput.value);
        const isDisabled = !hasIdentifier || !hasPassword || hasForbiddenIdentifierValue;

        submitButton.disabled = isDisabled;
        submitButton.setAttribute("aria-disabled", isDisabled ? "true" : "false");
    }

    function validateForm() {
        let isValid = true;
        clearFormMessage();

        if (!identifierInput.value.trim()) {
            showFieldError(identifierInput, identifierError, "Email or username is required");
            isValid = false;
        } else if (hasForbiddenIdentifier(identifierInput.value)) {
            showFieldError(identifierInput, identifierError, FORBIDDEN_VALUE_MESSAGE);
            isValid = false;
        } else {
            clearFieldError(identifierInput, identifierError);
        }

        if (!passwordInput.value.trim()) {
            showFieldError(passwordInput, passwordError, "Password is required");
            isValid = false;
        } else {
            clearFieldError(passwordInput, passwordError);
        }

        updateSubmitState();
        return isValid;
    }

    [identifierInput, passwordInput].forEach(input => {
        input.addEventListener("input", () => {
            if (input === identifierInput) {
                clearFieldError(identifierInput, identifierError);
                if (hasForbiddenIdentifier(identifierInput.value)) {
                    showFieldError(identifierInput, identifierError, FORBIDDEN_VALUE_MESSAGE);
                }
            } else {
                clearFieldError(passwordInput, passwordError);
            }

            clearFormMessage();
            updateSubmitState();
        });
    });

    form.addEventListener("submit", event => {
        if (!validateForm()) {
            event.preventDefault();
            showFormMessage(
                hasForbiddenIdentifier(identifierInput.value)
                    ? FORBIDDEN_VALUE_MESSAGE
                    : "Fill in both required fields before continuing."
            );
        }
    });

    updateSubmitState();
});
