document.addEventListener("DOMContentLoaded", () => {
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

    if (usernameForm) {
        usernameForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const username = usernameInput.value.trim();

            if (!username) {
                showMessage(usernameMessage, "Username cannot be empty", false);
                return;
            }

            try {
                const response = await fetch("/api/user/username", {
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
                showMessage(usernameMessage, "Server error while updating username", false);
            }
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const oldPassword = oldPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmNewPassword = confirmNewPasswordInput.value;

            if (!oldPassword || !newPassword || !confirmNewPassword) {
                showMessage(passwordMessage, "All password fields are required", false);
                return;
            }

            try {
                const response = await fetch("/api/user/password", {
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
