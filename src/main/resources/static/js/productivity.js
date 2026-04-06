document.addEventListener("DOMContentLoaded", () => {
    const STORAGE_KEY = "telos.productivity.v1";
    const DEFAULT_TAB = "todo";
    const ITEM_TYPES = ["todo", "notes"];
    const API_ITEM_TYPES = ["notes"];
    const itemLabels = {
        todo: "task",
        notes: "note"
    };
    const inputIds = {
        todo: "todoInput",
        notes: "noteInput"
    };
    const inputNames = {
        todo: "text",
        notes: "content"
    };
    const dateFormatter = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
    const csrfToken = document.querySelector('meta[name="_csrf"]')?.content;
    const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content;

    const tabButtons = Array.from(document.querySelectorAll("[data-tab-trigger]"));
    const panels = Array.from(document.querySelectorAll("[data-tab-panel]"));
    const forms = Object.fromEntries(
        ITEM_TYPES.map(type => [type, document.querySelector(`[data-entry-form="${type}"]`)])
    );
    const lists = Object.fromEntries(
        ITEM_TYPES.map(type => [type, document.querySelector(`[data-item-list="${type}"]`)])
    );
    const emptyStates = Object.fromEntries(
        ITEM_TYPES.map(type => [type, document.querySelector(`[data-empty-state="${type}"]`)])
    );
    const formMessages = Object.fromEntries(
        ITEM_TYPES.map(type => [type, document.querySelector(`[data-form-message="${type}"]`)])
    );

    if (!tabButtons.length || !panels.length) return;

    const storageAdapter = {
        load() {
            try {
                const storedValue = window.localStorage.getItem(STORAGE_KEY);
                if (!storedValue) {
                    return this.emptyState();
                }

                const parsed = JSON.parse(storedValue);
                return this.normalize(parsed);
            } catch (error) {
                return this.emptyState();
            }
        },
        save(nextState) {
            const normalizedState = this.normalize(nextState);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedState));
            return normalizedState;
        },
        list(type) {
            return this.load()[type];
        },
        create(type, payload) {
            if (type === "notes") {
                throw new Error("Notes are stored on the server");
            }

            const state = this.load();
            const now = new Date().toISOString();
            const nextItem = {
                id: createId(),
                createdAt: now,
                updatedAt: now,
                ...payload
            };

            state[type] = [nextItem, ...state[type]];
            return this.save(state)[type];
        },
        update(type, itemId, changes) {
            if (type === "notes") {
                throw new Error("Notes are stored on the server");
            }

            const state = this.load();
            state[type] = state[type].map(item => {
                if (item.id !== itemId) return item;

                return {
                    ...item,
                    ...changes,
                    updatedAt: new Date().toISOString()
                };
            });

            return this.save(state)[type];
        },
        delete(type, itemId) {
            if (type === "notes") {
                throw new Error("Notes are stored on the server");
            }

            const state = this.load();
            state[type] = state[type].filter(item => item.id !== itemId);
            return this.save(state)[type];
        },
        emptyState() {
            return {
                todo: [],
                notes: []
            };
        },
        normalize(rawState) {
            const safeState = this.emptyState();

            safeState.todo = Array.isArray(rawState?.todo)
                ? rawState.todo
                    .filter(item => item && typeof item.id === "string" && typeof item.text === "string")
                    .map(item => ({
                        id: item.id,
                        text: item.text,
                        completed: Boolean(item.completed),
                        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
                        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString()
                    }))
                : [];

            return safeState;
        }
    };

    const state = {
        activeTab: DEFAULT_TAB,
        items: {
            ...storageAdapter.load(),
            notes: []
        },
        editingByType: {
            todo: null,
            notes: null
        },
        loadingByType: {
            todo: false,
            notes: false
        }
    };

    function getRequestHeaders() {
        return {
            "Content-Type": "application/json",
            ...(csrfToken && csrfHeader ? { [csrfHeader]: csrfToken } : {})
        };
    }

    async function parseJsonSafe(response) {
        const text = await response.text();
        if (!text) return null;

        try {
            return JSON.parse(text);
        } catch (error) {
            return null;
        }
    }

    function getApiErrorMessage(data, fallbackMessage) {
        return data?.message || fallbackMessage;
    }

    function mapNoteFromApi(note) {
        return {
            id: String(note.noteId),
            content: note.noteText,
            createdAt: typeof note.createdAt === "string" ? note.createdAt : new Date().toISOString(),
            updatedAt: typeof note.updatedAt === "string"
                ? note.updatedAt
                : (typeof note.createdAt === "string" ? note.createdAt : new Date().toISOString())
        };
    }

    async function fetchNotes() {
        const response = await fetch("/api/productivity/notes", {
            method: "GET",
            headers: csrfToken && csrfHeader ? { [csrfHeader]: csrfToken } : {}
        });
        const data = await parseJsonSafe(response);

        if (!response.ok) {
            throw new Error(getApiErrorMessage(data, "Failed to load notes"));
        }

        return Array.isArray(data) ? data.map(mapNoteFromApi) : [];
    }

    async function createNote(payload) {
        const response = await fetch("/api/productivity/notes", {
            method: "POST",
            headers: getRequestHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await parseJsonSafe(response);

        if (!response.ok) {
            throw new Error(getApiErrorMessage(data, "Failed to create note"));
        }

        return mapNoteFromApi(data);
    }

    async function updateNote(itemId, payload) {
        const response = await fetch(`/api/productivity/notes/${itemId}`, {
            method: "PATCH",
            headers: getRequestHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await parseJsonSafe(response);

        if (!response.ok) {
            throw new Error(getApiErrorMessage(data, "Failed to update note"));
        }

        return mapNoteFromApi(data);
    }

    async function deleteNote(itemId) {
        const response = await fetch(`/api/productivity/notes/${itemId}`, {
            method: "DELETE",
            headers: csrfToken && csrfHeader ? { [csrfHeader]: csrfToken } : {}
        });

        if (!response.ok) {
            const data = await parseJsonSafe(response);
            throw new Error(getApiErrorMessage(data, "Failed to delete note"));
        }
    }

    function createId() {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }

        return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function formatTimestamp(value) {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) {
            // Fallback for corrupted or unparsable timestamps
            return "";
        }
        return dateFormatter.format(date);
    }

    function syncStateFromStorage() {
        state.items.todo = storageAdapter.load().todo;
    }

    function clearFormMessage(type) {
        const messageElement = formMessages[type];
        if (!messageElement) return;

        messageElement.textContent = "";
        messageElement.classList.add("hidden");
        messageElement.classList.remove("form-message--error", "form-message--success");
    }

    function showFormMessage(type, message, isError = true) {
        const messageElement = formMessages[type];
        if (!messageElement) return;

        messageElement.textContent = message;
        messageElement.classList.remove("hidden");
        messageElement.classList.toggle("form-message--error", isError);
        messageElement.classList.toggle("form-message--success", !isError);
    }

    function focusPrimaryInput(type) {
        document.getElementById(inputIds[type])?.focus();
    }

    function setActiveTab(nextTab) {
        state.activeTab = nextTab;

        tabButtons.forEach(button => {
            const isActive = button.dataset.tabTrigger === nextTab;
            button.classList.toggle("productivity-tab--active", isActive);
            button.setAttribute("aria-selected", isActive ? "true" : "false");
            button.tabIndex = isActive ? 0 : -1;
        });

        panels.forEach(panel => {
            const isActive = panel.dataset.tabPanel === nextTab;
            panel.classList.toggle("hidden", !isActive);
            panel.setAttribute("aria-hidden", isActive ? "false" : "true");
        });

        focusPrimaryInput(nextTab);
    }

    function getTrimmedValue(type, container) {
        const fieldName = inputNames[type];
        const input = container.querySelector(`[name="${fieldName}"]`);
        if (!input) return "";

        return input.value.trim();
    }

    function markInvalid(input, shouldMark) {
        if (!input) return;

        if (shouldMark) {
            input.setAttribute("aria-invalid", "true");
            input.classList.add("settings-input--invalid");
            return;
        }

        input.removeAttribute("aria-invalid");
        input.classList.remove("settings-input--invalid");
    }

    function renderTodoItem(item) {
        const isEditing = state.editingByType.todo === item.id;
        const completedClass = item.completed ? " productivity-item__content--completed" : "";

        if (isEditing) {
            return `
                <li class="productivity-item productivity-item--editing" data-item-id="${item.id}" data-item-type="todo">
                    <div class="productivity-item__editor">
                        <input
                            class="settings-input productivity-input productivity-item__editor-input"
                            data-edit-field="todo"
                            name="text"
                            type="text"
                            maxlength="160"
                            value="${escapeHtml(item.text)}"
                        >
                    </div>
                    <div class="productivity-item__actions">
                        <button class="productivity-action productivity-action--primary" type="button" data-action="save-edit">Save</button>
                        <button class="productivity-action" type="button" data-action="cancel-edit">Cancel</button>
                    </div>
                </li>
            `;
        }

        return `
            <li class="productivity-item" data-item-id="${item.id}" data-item-type="todo">
                <label class="productivity-check">
                    <input
                        class="settings-checkbox productivity-check__input"
                        type="checkbox"
                        data-action="toggle-complete"
                        ${item.completed ? "checked" : ""}
                    >
                    <span class="productivity-item__content${completedClass}">${escapeHtml(item.text)}</span>
                </label>
                <div class="productivity-item__actions">
                    <button class="productivity-action" type="button" data-action="edit">Edit</button>
                    <button class="productivity-action productivity-action--danger" type="button" data-action="delete">Delete</button>
                </div>
            </li>
        `;
    }

    function renderNoteItem(item) {
        const isEditing = state.editingByType.notes === item.id;

        if (isEditing) {
            return `
                <li class="productivity-item productivity-item--note productivity-item--editing" data-item-id="${item.id}" data-item-type="notes">
                    <div class="productivity-item__editor productivity-item__editor--note">
                        <textarea
                            class="settings-input productivity-input productivity-textarea productivity-item__editor-textarea"
                            data-edit-field="notes"
                            name="content"
                            rows="5"
                            maxlength="1200"
                        >${escapeHtml(item.content)}</textarea>
                    </div>
                    <div class="productivity-item__actions">
                        <button class="productivity-action productivity-action--primary" type="button" data-action="save-edit">Save</button>
                        <button class="productivity-action" type="button" data-action="cancel-edit">Cancel</button>
                    </div>
                </li>
            `;
        }

        return `
            <li class="productivity-item productivity-item--note" data-item-id="${item.id}" data-item-type="notes">
                <article class="productivity-note">
                    <p class="productivity-note__content">${escapeHtml(item.content).replaceAll("\n", "<br>")}</p>
                    <p class="productivity-note__meta">Updated ${formatTimestamp(item.updatedAt)}</p>
                </article>
                <div class="productivity-item__actions">
                    <button class="productivity-action" type="button" data-action="edit">Edit</button>
                    <button class="productivity-action productivity-action--danger" type="button" data-action="delete">Delete</button>
                </div>
            </li>
        `;
    }

    function renderType(type) {
        const list = lists[type];
        const items = state.items[type];
        if (!list) return;

        list.innerHTML = items.map(item => type === "todo" ? renderTodoItem(item) : renderNoteItem(item)).join("");

        const emptyState = emptyStates[type];
        if (emptyState) {
            const shouldHide = state.loadingByType[type] || items.length > 0;
            emptyState.classList.toggle("hidden", shouldHide);

            if (state.loadingByType[type]) {
                emptyState.textContent = `Loading ${itemLabels[type]}s...`;
            } else if (type === "todo") {
                emptyState.textContent = "No tasks yet. Add the first one to build your list.";
            } else {
                emptyState.textContent = "No notes yet. Add one to keep context close to your work.";
            }
        }
    }

    function render() {
        ITEM_TYPES.forEach(type => {
            clearFormMessage(type);
            renderType(type);
        });

        setActiveTab(state.activeTab);
    }

    async function handleAdd(type, form) {
        const input = form.querySelector(`[name="${inputNames[type]}"]`);
        const value = getTrimmedValue(type, form);

        markInvalid(input, false);
        clearFormMessage(type);

        if (!value) {
            markInvalid(input, true);
            showFormMessage(type, `Please enter a ${itemLabels[type]} before adding it.`);
            input?.focus();
            return;
        }

        if (type === "todo") {
            storageAdapter.create("todo", {
                text: value,
                completed: false
            });

            syncStateFromStorage();
            form.reset();
            renderType(type);
            focusPrimaryInput(type);
            return;
        }

        try {
            const createdNote = await createNote({
                noteText: value
            });
            state.items.notes = [createdNote, ...state.items.notes];
            form.reset();
            renderType(type);
            focusPrimaryInput(type);
            showFormMessage(type, "Note was created successfully", false);
        } catch (error) {
            showFormMessage(type, error.message || "Failed to create note");
        }
    }

    function beginEditing(type, itemId) {
        state.editingByType[type] = itemId;
        renderType(type);
        const editor = lists[type]?.querySelector(`[data-item-id="${itemId}"] [data-edit-field="${type}"]`);
        editor?.focus();
        if (editor && "selectionStart" in editor) {
            editor.selectionStart = editor.value.length;
            editor.selectionEnd = editor.value.length;
        }
    }

    function stopEditing(type) {
        state.editingByType[type] = null;
        renderType(type);
    }

    async function saveEdit(itemElement) {
        const type = itemElement.dataset.itemType;
        const itemId = itemElement.dataset.itemId;
        const editor = itemElement.querySelector(`[data-edit-field="${type}"]`);
        const nextValue = editor?.value.trim() || "";

        markInvalid(editor, false);

        if (!type || !itemId || !editor) return;

        if (!nextValue) {
            markInvalid(editor, true);
            editor.focus();
            return;
        }

        if (type === "todo") {
            storageAdapter.update("todo", itemId, { text: nextValue });

            syncStateFromStorage();
            state.editingByType[type] = null;
            renderType(type);
            return;
        }

        try {
            const updatedNote = await updateNote(itemId, { noteText: nextValue });
            state.items.notes = state.items.notes.map(note => note.id === itemId ? updatedNote : note);
            state.editingByType[type] = null;
            renderType(type);
            showFormMessage(type, "Note was updated successfully", false);
        } catch (error) {
            showFormMessage(type, error.message || "Failed to update note");
        }
    }

    async function loadNotesIntoState() {
        state.loadingByType.notes = true;
        renderType("notes");

        try {
            state.items.notes = await fetchNotes();
        } catch (error) {
            state.items.notes = [];
            showFormMessage("notes", error.message || "Failed to load notes");
        } finally {
            state.loadingByType.notes = false;
            renderType("notes");
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            setActiveTab(button.dataset.tabTrigger || DEFAULT_TAB);
        });
    });

    ITEM_TYPES.forEach(type => {
        forms[type]?.addEventListener("submit", event => {
            event.preventDefault();
            handleAdd(type, event.currentTarget);
        });

        forms[type]?.addEventListener("input", event => {
            const input = event.target.closest(`[name="${inputNames[type]}"]`);
            if (!input) return;

            markInvalid(input, false);
            clearFormMessage(type);
        });

        lists[type]?.addEventListener("click", event => {
            const actionButton = event.target.closest("[data-action]");
            if (!actionButton) return;

            const itemElement = actionButton.closest("[data-item-id]");
            const itemId = itemElement?.dataset.itemId;

            if (!itemElement || !itemId) return;

            switch (actionButton.dataset.action) {
                case "edit":
                    beginEditing(type, itemId);
                    break;
                case "delete":
                    if (type === "todo") {
                        storageAdapter.delete(type, itemId);
                        syncStateFromStorage();
                        if (state.editingByType[type] === itemId) {
                            state.editingByType[type] = null;
                        }
                        renderType(type);
                        break;
                    }

                    deleteNote(itemId)
                        .then(() => {
                            state.items.notes = state.items.notes.filter(note => note.id !== itemId);
                            if (state.editingByType[type] === itemId) {
                                state.editingByType[type] = null;
                            }
                            renderType(type);
                            showFormMessage(type, "Note was deleted successfully", false);
                        })
                        .catch(error => {
                            showFormMessage(type, error.message || "Failed to delete note");
                        });
                    break;
                case "cancel-edit":
                    stopEditing(type);
                    break;
                case "save-edit":
                    saveEdit(itemElement);
                    break;
                default:
                    break;
            }
        });

        lists[type]?.addEventListener("change", event => {
            const checkbox = event.target.closest('[data-action="toggle-complete"]');
            const itemElement = checkbox?.closest("[data-item-id]");
            const itemId = itemElement?.dataset.itemId;

            if (!checkbox || !itemId || type !== "todo") return;

            storageAdapter.update("todo", itemId, {
                completed: checkbox.checked
            });
            syncStateFromStorage();
            renderType("todo");
        });

        lists[type]?.addEventListener("keydown", event => {
            const itemElement = event.target.closest("[data-item-id]");
            if (!itemElement) return;

            const itemId = itemElement.dataset.itemId;
            const isEditing = itemId && state.editingByType?.[type] === itemId;

            const keyIsTodoSave = type === "todo" && event.key === "Enter";
            const keyIsNoteSave = type === "notes" && event.key === "Enter" && (event.metaKey || event.ctrlKey);

            if (!keyIsTodoSave && !keyIsNoteSave) return;

            // Only treat Enter as a save action when the focused element is an editor field
            // within the item that is currently being edited.
            const editorField = event.target.closest("input, textarea");
            const editorBelongsToItem = editorField && itemElement.contains(editorField);

            if (!isEditing || !editorBelongsToItem) return;
            event.preventDefault();
            saveEdit(itemElement);
        });
    });

    window.addEventListener("storage", event => {
        if (event.key !== STORAGE_KEY) return;
        syncStateFromStorage();
        renderType("todo");
    });

    render();
    loadNotesIntoState();
});
