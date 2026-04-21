document.addEventListener("DOMContentLoaded", () => {
    const DEFAULT_TAB = "todo";
    const ITEM_TYPES = ["todo", "notes"];
    const TODO_PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH"];
    const itemLabels = {
        todo: "task",
        notes: "note"
    };
    const inputIds = {
        todo: "todoInput",
        notes: "noteInput"
    };
    const inputNames = {
        todo: "title",
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
    const activeCountElement = document.querySelector("[data-active-count]");

    if (!tabButtons.length || !panels.length) return;

    const state = {
        activeTab: DEFAULT_TAB,
        items: {
            todo: [],
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

    function mapTodoFromApi(todo) {
        return {
            id: String(todo.todoId),
            title: todo.title || "",
            description: todo.description || "",
            completed: Boolean(todo.isDone),
            priority: TODO_PRIORITY_VALUES.includes(todo.priority) ? todo.priority : "LOW",
            deadline: typeof todo.deadline === "string" ? todo.deadline : "",
            createdAt: typeof todo.createdAt === "string" ? todo.createdAt : new Date().toISOString()
        };
    }

    function mapTodoToApiPayload(todo) {
        return {
            title: todo.title,
            description: todo.description || null,
            isDone: Boolean(todo.completed),
            priority: todo.priority,
            deadline: normalizeDeadlineForApi(todo.deadline) || null
        };
    }

    async function fetchCollection(url, mapFn, fallbackMessage) {
        const response = await fetch(url, {
            method: "GET",
            headers: csrfToken && csrfHeader ? { [csrfHeader]: csrfToken } : {}
        });
        const data = await parseJsonSafe(response);

        if (!response.ok) {
            throw new Error(getApiErrorMessage(data, fallbackMessage));
        }

        return Array.isArray(data) ? data.map(mapFn) : [];
    }

    async function submitJson(url, method, payload, mapFn, fallbackMessage) {
        const response = await fetch(url, {
            method,
            headers: getRequestHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await parseJsonSafe(response);

        if (!response.ok) {
            throw new Error(getApiErrorMessage(data, fallbackMessage));
        }

        return mapFn ? mapFn(data) : data;
    }

    async function deleteItem(url, fallbackMessage) {
        const response = await fetch(url, {
            method: "DELETE",
            headers: csrfToken && csrfHeader ? { [csrfHeader]: csrfToken } : {}
        });

        if (!response.ok) {
            const data = await parseJsonSafe(response);
            throw new Error(getApiErrorMessage(data, fallbackMessage));
        }
    }

    async function fetchNotes() {
        return fetchCollection("/api/productivity/notes", mapNoteFromApi, "Failed to load notes");
    }

    async function createNote(payload) {
        return submitJson("/api/productivity/notes", "POST", payload, mapNoteFromApi, "Failed to create note");
    }

    async function updateNote(itemId, payload) {
        return submitJson(`/api/productivity/notes/${itemId}`, "PATCH", payload, mapNoteFromApi, "Failed to update note");
    }

    async function deleteNote(itemId) {
        return deleteItem(`/api/productivity/notes/${itemId}`, "Failed to delete note");
    }

    async function fetchTodos() {
        return fetchCollection("/api/productivity/todos", mapTodoFromApi, "Failed to load tasks");
    }

    async function createTodo(payload) {
        return submitJson("/api/productivity/todos", "POST", payload, mapTodoFromApi, "Failed to create task");
    }

    async function updateTodo(itemId, payload) {
        return submitJson(`/api/productivity/todos/${itemId}`, "PATCH", payload, mapTodoFromApi, "Failed to update task");
    }

    async function deleteTodo(itemId) {
        return deleteItem(`/api/productivity/todos/${itemId}`, "Failed to delete task");
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
        if (!value) return "";

        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return dateFormatter.format(date);
    }

    function formatDeadlineForInput(value) {
        if (!value) return "";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";

        const pad = part => String(part).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function normalizeDeadlineForApi(value) {
        if (!value) return "";

        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return `${value}T23:59`;
        }

        return value;
    }

    function containsForbiddenValue(value) {
        const normalized = String(value)
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();

        return normalized === "67" || normalized === "six seven";
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

    function normalizeTodoDraft(rawDraft) {
        const title = (rawDraft.title || "").trim();
        const description = (rawDraft.description || "").trim();
        const priority = TODO_PRIORITY_VALUES.includes(rawDraft.priority) ? rawDraft.priority : "LOW";
        const deadline = rawDraft.deadline || "";
        const completed = Boolean(rawDraft.completed);

        return {
            title,
            description,
            priority,
            deadline,
            completed
        };
    }

    function getPriorityValue(container) {
        return container.querySelector('[name="priority"]:checked')?.value
            || container.querySelector('select[name="priority"]')?.value
            || container.querySelector('[name="priority"]')?.value;
    }

    function getDeadlineValue(container) {
        const deadlineInput = container.querySelector('[name="deadline"]');
        const deadlineToggle = container.querySelector("[data-deadline-toggle]");

        if (deadlineToggle && !deadlineToggle.checked) {
            return "";
        }

        return deadlineInput?.value || "";
    }

    function syncDeadlineInputState(form) {
        const deadlineToggle = form?.querySelector("[data-deadline-toggle]");
        const deadlineInput = form?.querySelector('[name="deadline"]');
        if (!deadlineToggle || !deadlineInput) return;

        deadlineInput.disabled = !deadlineToggle.checked;
    }

    function syncFormToggleState(form) {
        const toggle = form?.querySelector("[data-form-toggle]");
        if (!toggle) return;

        const isCollapsed = form.classList.contains("productivity-entry-form--collapsed");
        const label = form.dataset.entryForm === "notes" ? "note" : "task";
        toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
        toggle.setAttribute("aria-label", isCollapsed ? `Expand ${label} form` : `Collapse ${label} form`);
    }

    function readTodoFormDraft(container) {
        return normalizeTodoDraft({
            title: container.querySelector('[name="title"]')?.value,
            description: container.querySelector('[name="description"]')?.value,
            priority: getPriorityValue(container),
            deadline: getDeadlineValue(container),
            completed: container.querySelector('[name="isDone"]')?.checked
        });
    }

    function validateTodoDraft(container, draft) {
        const titleInput = container.querySelector('[name="title"]');
        const priorityInput = container.querySelector('[name="priority"]');
        const deadlineInput = container.querySelector('[name="deadline"]');

        markInvalid(titleInput, false);
        markInvalid(priorityInput, false);
        markInvalid(deadlineInput, false);

        if (!draft.title) {
            markInvalid(titleInput, true);
            titleInput?.focus();
            return "Please enter a task before adding it.";
        }

        if (containsForbiddenValue(draft.title) || containsForbiddenValue(draft.description)) {
            markInvalid(titleInput, true);
            titleInput?.focus();
            return "67 and six seven are not allowed here.";
        }

        if (!draft.priority) {
            markInvalid(priorityInput, true);
            priorityInput?.focus();
            return "Please choose a priority.";
        }

        if (draft.deadline) {
            const deadline = new Date(normalizeDeadlineForApi(draft.deadline));
            if (Number.isNaN(deadline.getTime())) {
                markInvalid(deadlineInput, true);
                deadlineInput?.focus();
                return "Please enter a valid deadline.";
            }

            if (deadline.getTime() < Date.now()) {
                markInvalid(deadlineInput, true);
                deadlineInput?.focus();
                return "Deadline cannot be in the past.";
            }
        }

        return null;
    }

    function getTodoPriorityClass(priority) {
        const normalizedPriority = String(priority || "LOW").toLowerCase();
        return `productivity-item__badge--priority-${normalizedPriority}`;
    }

    function getTodoPriorityActionClass(priority) {
        const normalizedPriority = String(priority || "LOW").toLowerCase();
        return `productivity-action--priority-${normalizedPriority}`;
    }

    function renderTodoItem(item) {
        const isEditing = state.editingByType.todo === item.id;
        const completedClass = item.completed ? " productivity-item__content--completed" : "";
        const priorityLabel = String(item.priority || "LOW").toLowerCase();
        const descriptionMarkup = item.description
            ? `<p class="productivity-item__description">${escapeHtml(item.description).replaceAll("\n", "<br>")}</p>`
            : "";
        const deadlineLabel = item.deadline
            ? `<span class="productivity-item__badge">Due ${formatTimestamp(item.deadline)}</span>`
            : "";

        if (isEditing) {
            return `
                <li class="productivity-item productivity-item--editing" data-item-id="${item.id}" data-item-type="todo">
                    <div class="productivity-item__editor productivity-item__editor-grid">
                        <div class="productivity-field">
                            <label class="settings-label" for="todo-edit-title-${item.id}">Task</label>
                            <input
                                id="todo-edit-title-${item.id}"
                                class="settings-input productivity-input productivity-item__editor-input"
                                data-edit-field="todo"
                                name="title"
                                type="text"
                                maxlength="25"
                                value="${escapeHtml(item.title)}"
                            >
                        </div>
                        <div class="productivity-field">
                            <label class="settings-label" for="todo-edit-description-${item.id}">Description</label>
                            <textarea
                                id="todo-edit-description-${item.id}"
                                class="settings-input productivity-input productivity-textarea productivity-textarea--compact"
                                name="description"
                                rows="3"
                                maxlength="1000"
                            >${escapeHtml(item.description)}</textarea>
                        </div>
                        <div class="productivity-field-row">
                            <div class="productivity-field">
                                <label class="settings-label" for="todo-edit-priority-${item.id}">Priority</label>
                                <select
                                    id="todo-edit-priority-${item.id}"
                                    class="settings-input productivity-input"
                                    name="priority"
                                >
                                    ${TODO_PRIORITY_VALUES.map(priority => `
                                        <option value="${priority}"${priority === item.priority ? " selected" : ""}>${priority.charAt(0)}${priority.slice(1).toLowerCase()}</option>
                                    `).join("")}
                                </select>
                            </div>
                            <div class="productivity-field">
                                <label class="settings-label" for="todo-edit-deadline-${item.id}">Deadline</label>
                                <input
                                    id="todo-edit-deadline-${item.id}"
                                    class="settings-input productivity-input"
                                    name="deadline"
                                    type="datetime-local"
                                    value="${formatDeadlineForInput(item.deadline)}"
                                >
                            </div>
                        </div>
                        <label class="settings-label checkbox-label">
                            <input
                                class="productivity-checkbox productivity-edit-checkbox"
                                name="isDone"
                                type="checkbox"
                                ${item.completed ? "checked" : ""}
                            >
                            <span>Completed</span>
                        </label>
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
                        class="productivity-checkbox productivity-check__input"
                        type="checkbox"
                        data-action="toggle-complete"
                        ${item.completed ? "checked" : ""}
                    >
                    <div class="productivity-item__body">
                        <span class="productivity-item__content${completedClass}">${escapeHtml(item.title)}</span>
                        ${descriptionMarkup}
                        <div class="productivity-item__meta">
                            ${deadlineLabel}
                        </div>
                    </div>
                </label>
                <div class="productivity-item__actions">
                    <span class="productivity-action productivity-action--priority ${getTodoPriorityActionClass(item.priority)}">${escapeHtml(priorityLabel)}</span>
                    <div class="productivity-action-menu">
                        <button class="productivity-action productivity-action--menu" type="button" aria-label="Open task actions" aria-haspopup="true">
                            <span aria-hidden="true">&#8942;</span>
                        </button>
                        <div class="productivity-action-menu__panel" role="menu">
                            <button class="productivity-action-menu__item" type="button" data-action="edit" role="menuitem">Edit</button>
                            <button class="productivity-action-menu__item productivity-action-menu__item--danger" type="button" data-action="delete" role="menuitem">Delete</button>
                        </div>
                    </div>
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
                    <div class="productivity-action-menu">
                        <button class="productivity-action productivity-action--menu" type="button" aria-label="Open note actions" aria-haspopup="true">
                            <span aria-hidden="true">&#8942;</span>
                        </button>
                        <div class="productivity-action-menu__panel" role="menu">
                            <button class="productivity-action-menu__item" type="button" data-action="edit" role="menuitem">Edit</button>
                            <button class="productivity-action-menu__item productivity-action-menu__item--danger" type="button" data-action="delete" role="menuitem">Delete</button>
                        </div>
                    </div>
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
        if (!emptyState) return;

        const shouldHide = state.loadingByType[type] || items.length > 0;
        emptyState.classList.toggle("hidden", shouldHide);

        if (type === "todo" && activeCountElement) {
            activeCountElement.textContent = String(items.filter(item => !item.completed).length);
        }

        if (state.loadingByType[type]) {
            emptyState.textContent = `Loading ${itemLabels[type]}s...`;
            return;
        }

        emptyState.textContent = type === "todo"
            ? "No tasks yet. Add the first one to build your list."
            : "No notes yet. Add one to keep context close to your work.";
    }

    function render() {
        ITEM_TYPES.forEach(type => {
            clearFormMessage(type);
            renderType(type);
        });

        setActiveTab(state.activeTab);
    }

    async function handleAddTodo(form) {
        clearFormMessage("todo");

        const draft = readTodoFormDraft(form);
        const validationMessage = validateTodoDraft(form, draft);
        if (validationMessage) {
            showFormMessage("todo", validationMessage);
            return;
        }

        try {
            const createdTodo = await createTodo(mapTodoToApiPayload(draft));
            state.items.todo = [createdTodo, ...state.items.todo];
            form.reset();
            resetTodoPriority(form);
            renderType("todo");
            focusPrimaryInput("todo");
            showFormMessage("todo", "Task was created successfully", false);
        } catch (error) {
            showFormMessage("todo", error.message || "Failed to create task");
        }
    }

    async function handleAddNote(form) {
        clearFormMessage("notes");

        const input = form.querySelector('[name="content"]');
        const value = input?.value.trim() || "";

        markInvalid(input, false);

        if (!value) {
            markInvalid(input, true);
            showFormMessage("notes", "Please enter a note before adding it.");
            input?.focus();
            return;
        }

        if (containsForbiddenValue(value)) {
            markInvalid(input, true);
            showFormMessage("notes", "67 and six seven are not allowed here.");
            input?.focus();
            return;
        }

        try {
            const createdNote = await createNote({ noteText: value });
            state.items.notes = [createdNote, ...state.items.notes];
            form.reset();
            renderType("notes");
            focusPrimaryInput("notes");
            showFormMessage("notes", "Note was created successfully", false);
        } catch (error) {
            showFormMessage("notes", error.message || "Failed to create note");
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

    async function saveTodoEdit(itemElement) {
        const itemId = itemElement.dataset.itemId;
        const draft = readTodoFormDraft(itemElement);
        const validationMessage = validateTodoDraft(itemElement, draft);

        if (validationMessage) {
            showFormMessage("todo", validationMessage);
            return;
        }

        try {
            const updatedTodo = await updateTodo(itemId, mapTodoToApiPayload(draft));
            state.items.todo = state.items.todo.map(todo => todo.id === itemId ? updatedTodo : todo);
            state.editingByType.todo = null;
            renderType("todo");
            showFormMessage("todo", "Task was updated successfully", false);
        } catch (error) {
            showFormMessage("todo", error.message || "Failed to update task");
        }
    }

    async function saveNoteEdit(itemElement) {
        const itemId = itemElement.dataset.itemId;
        const editor = itemElement.querySelector('[name="content"]');
        const nextValue = editor?.value.trim() || "";

        markInvalid(editor, false);

        if (!nextValue) {
            markInvalid(editor, true);
            showFormMessage("notes", "Please enter a note before saving it.");
            editor?.focus();
            return;
        }

        if (containsForbiddenValue(nextValue)) {
            markInvalid(editor, true);
            showFormMessage("notes", "67 and six seven are not allowed here.");
            editor?.focus();
            return;
        }

        try {
            const updatedNote = await updateNote(itemId, { noteText: nextValue });
            state.items.notes = state.items.notes.map(note => note.id === itemId ? updatedNote : note);
            state.editingByType.notes = null;
            renderType("notes");
            showFormMessage("notes", "Note was updated successfully", false);
        } catch (error) {
            showFormMessage("notes", error.message || "Failed to update note");
        }
    }

    async function deleteTodoAndRender(itemId) {
        try {
            await deleteTodo(itemId);
            state.items.todo = state.items.todo.filter(todo => todo.id !== itemId);
            if (state.editingByType.todo === itemId) {
                state.editingByType.todo = null;
            }
            renderType("todo");
            showFormMessage("todo", "Task was deleted successfully", false);
        } catch (error) {
            showFormMessage("todo", error.message || "Failed to delete task");
        }
    }

    async function deleteNoteAndRender(itemId) {
        try {
            await deleteNote(itemId);
            state.items.notes = state.items.notes.filter(note => note.id !== itemId);
            if (state.editingByType.notes === itemId) {
                state.editingByType.notes = null;
            }
            renderType("notes");
            showFormMessage("notes", "Note was deleted successfully", false);
        } catch (error) {
            showFormMessage("notes", error.message || "Failed to delete note");
        }
    }

    async function toggleTodoCompletion(itemId, completed) {
        const currentTodo = state.items.todo.find(todo => todo.id === itemId);
        if (!currentTodo) return;

        const nextDraft = {
            ...currentTodo,
            completed
        };

        try {
            const updatedTodo = await updateTodo(itemId, mapTodoToApiPayload(nextDraft));
            state.items.todo = state.items.todo.map(todo => todo.id === itemId ? updatedTodo : todo);
            renderType("todo");
        } catch (error) {
            showFormMessage("todo", error.message || "Failed to update task");
            renderType("todo");
        }
    }

    async function loadType(type) {
        state.loadingByType[type] = true;
        renderType(type);

        try {
            state.items[type] = type === "todo"
                ? await fetchTodos()
                : await fetchNotes();
        } catch (error) {
            state.items[type] = [];
            showFormMessage(type, error.message || `Failed to load ${itemLabels[type]}s`);
        } finally {
            state.loadingByType[type] = false;
            renderType(type);
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            setActiveTab(button.dataset.tabTrigger || DEFAULT_TAB);
        });
    });

    forms.todo?.addEventListener("submit", event => {
        event.preventDefault();
        handleAddTodo(event.currentTarget);
    });

    forms.notes?.addEventListener("submit", event => {
        event.preventDefault();
        handleAddNote(event.currentTarget);
    });

    ITEM_TYPES.forEach(type => {
        forms[type]?.addEventListener("input", event => {
            const input = event.target.closest("input, textarea, select");
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
                        deleteTodoAndRender(itemId);
                    } else {
                        deleteNoteAndRender(itemId);
                    }
                    break;
                case "cancel-edit":
                    stopEditing(type);
                    break;
                case "save-edit":
                    if (type === "todo") {
                        saveTodoEdit(itemElement);
                    } else {
                        saveNoteEdit(itemElement);
                    }
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

            toggleTodoCompletion(itemId, checkbox.checked);
        });

        lists[type]?.addEventListener("keydown", event => {
            const itemElement = event.target.closest("[data-item-id]");
            if (!itemElement) return;

            const itemId = itemElement.dataset.itemId;
            const isEditing = itemId && state.editingByType?.[type] === itemId;
            const editorField = event.target.closest("input, textarea");
            const editorBelongsToItem = editorField && itemElement.contains(editorField);

            const keyIsTodoSave = type === "todo" && event.key === "Enter" && !event.shiftKey;
            const keyIsNoteSave = type === "notes" && event.key === "Enter" && (event.metaKey || event.ctrlKey);

            if (!editorBelongsToItem || !isEditing) return;
            if (!keyIsTodoSave && !keyIsNoteSave) return;

            if (type === "todo" && editorField?.tagName === "TEXTAREA") return;

            event.preventDefault();
            if (type === "todo") {
                saveTodoEdit(itemElement);
            } else {
                saveNoteEdit(itemElement);
            }
        });
    });

    const todoPriorityInput = forms.todo?.querySelector('[name="priority"]');
    function resetTodoPriority(form) {
        const defaultPriorityInput = form?.querySelector('[name="priority"][value="HIGH"]');
        if (defaultPriorityInput && "checked" in defaultPriorityInput) {
            defaultPriorityInput.checked = true;
            return;
        }

        const priorityInput = form?.querySelector('[name="priority"]');
        if (priorityInput) {
            priorityInput.value = "HIGH";
        }
    }

    if (todoPriorityInput && !getPriorityValue(forms.todo)) {
        resetTodoPriority(forms.todo);
    }

    forms.todo?.addEventListener("reset", () => {
        window.setTimeout(() => {
            resetTodoPriority(forms.todo);
            syncDeadlineInputState(forms.todo);
            clearFormMessage("todo");
        }, 0);
    });

    forms.notes?.addEventListener("reset", () => {
        window.setTimeout(() => clearFormMessage("notes"), 0);
    });

    forms.todo?.querySelector("[data-deadline-toggle]")?.addEventListener("change", () => {
        syncDeadlineInputState(forms.todo);
    });

    forms.todo?.querySelector('[name="deadline"]')?.addEventListener("input", event => {
        const deadlineToggle = forms.todo?.querySelector("[data-deadline-toggle]");
        if (deadlineToggle && event.currentTarget.value) {
            deadlineToggle.checked = true;
            syncDeadlineInputState(forms.todo);
        }
    });

    document.querySelectorAll("[data-form-toggle]").forEach(toggle => {
        const form = toggle.closest(".productivity-entry-form");
        syncFormToggleState(form);

        const toggleForm = () => {
            form?.classList.toggle("productivity-entry-form--collapsed");
            syncFormToggleState(form);
        };

        toggle.addEventListener("click", () => {
            toggleForm();
        });

        toggle.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;

            event.preventDefault();
            toggleForm();
        });
    });

    syncDeadlineInputState(forms.todo);

    render();
    loadType("todo");
    loadType("notes");
});
