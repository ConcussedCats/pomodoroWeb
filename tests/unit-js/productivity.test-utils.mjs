import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

function toDatasetKey(attribute) {
    return attribute.replace(/^data-/, "").replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function decodeHtml(value) {
    return String(value)
        .replaceAll("&quot;", "\"")
        .replaceAll("&#39;", "'")
        .replaceAll("&gt;", ">")
        .replaceAll("&lt;", "<")
        .replaceAll("&amp;", "&");
}

function createEventTarget() {
    const listeners = new Map();

    return {
        addEventListener(type, callback) {
            if (!listeners.has(type)) {
                listeners.set(type, []);
            }

            listeners.get(type).push(callback);
        },
        dispatchEvent(event) {
            const safeEvent = event;
            safeEvent.defaultPrevented = false;
            safeEvent.preventDefault ??= () => {
                safeEvent.defaultPrevented = true;
            };
            safeEvent.stopPropagation ??= () => {};
            safeEvent.currentTarget = this;

            const callbacks = listeners.get(event.type) || [];
            callbacks.forEach(callback => callback(safeEvent));
            return !safeEvent.defaultPrevented;
        }
    };
}

function createClassList(initialClasses = []) {
    const classes = new Set(initialClasses);

    return {
        add(...tokens) {
            tokens.forEach(token => classes.add(token));
        },
        remove(...tokens) {
            tokens.forEach(token => classes.delete(token));
        },
        toggle(token, force) {
            if (typeof force === "boolean") {
                if (force) {
                    classes.add(token);
                    return true;
                }

                classes.delete(token);
                return false;
            }

            if (classes.has(token)) {
                classes.delete(token);
                return false;
            }

            classes.add(token);
            return true;
        },
        contains(token) {
            return classes.has(token);
        }
    };
}

function createElement({
    tagName = "div",
    id = "",
    name = "",
    dataset = {},
    attributes = {},
    classNames = [],
    value = "",
    checked = false,
    content = "",
    disabled = false
} = {}) {
    const elementTarget = createEventTarget();
    const attributeMap = new Map(Object.entries(attributes));

    const element = {
        ...elementTarget,
        tagName: tagName.toUpperCase(),
        id,
        name,
        dataset: { ...dataset },
        classList: createClassList(classNames),
        children: [],
        parentNode: null,
        textContent: "",
        value,
        checked,
        disabled,
        defaultValue: value,
        defaultChecked: checked,
        defaultDisabled: disabled,
        content: content || attributes.content || "",
        tabIndex: 0,
        wasFocused: false,
        _innerHTML: "",
        appendChild(child) {
            child.parentNode = this;
            this.children.push(child);
            return child;
        },
        replaceChildren(...children) {
            this.children = [];
            children.forEach(child => this.appendChild(child));
        },
        setAttribute(key, nextValue) {
            const safeValue = String(nextValue);
            attributeMap.set(key, safeValue);
            if (key === "id") this.id = safeValue;
            if (key === "name") this.name = safeValue;
            if (key === "content") this.content = safeValue;
            if (key === "value") this.value = safeValue;
            if (key === "disabled") this.disabled = true;
            if (key.startsWith("data-")) {
                this.dataset[toDatasetKey(key)] = safeValue;
            }
        },
        getAttribute(key) {
            if (key.startsWith("data-")) {
                const dataValue = this.dataset[toDatasetKey(key)];
                return typeof dataValue === "string" ? dataValue : null;
            }

            if (key === "name" && this.name) return this.name;
            if (key === "content") return this.content || null;
            if (key === "value") return this.value ?? null;

            return attributeMap.has(key) ? attributeMap.get(key) : null;
        },
        removeAttribute(key) {
            attributeMap.delete(key);
            if (key === "disabled") {
                this.disabled = false;
            }
            if (key.startsWith("data-")) {
                delete this.dataset[toDatasetKey(key)];
            }
        },
        focus() {
            this.wasFocused = true;
        },
        matches(selector) {
            return matchesSelector(this, selector);
        },
        reset() {
            getDescendants(this).forEach(descendant => {
                if (descendant.tagName === "INPUT" || descendant.tagName === "TEXTAREA" || descendant.tagName === "SELECT") {
                    descendant.value = descendant.defaultValue ?? "";
                }
                if (descendant.tagName === "INPUT" && ["checkbox", "radio"].includes(descendant.getAttribute("type"))) {
                    descendant.checked = descendant.defaultChecked ?? false;
                }
                descendant.disabled = descendant.defaultDisabled ?? false;
            });
        },
        closest(selector) {
            let current = this;
            while (current) {
                if (matchesSelector(current, selector)) {
                    return current;
                }
                current = current.parentNode;
            }
            return null;
        },
        contains(candidate) {
            let current = candidate;
            while (current) {
                if (current === this) return true;
                current = current.parentNode;
            }
            return false;
        },
        querySelector(selector) {
            return queryWithin(this, selector, true);
        },
        querySelectorAll(selector) {
            return queryWithin(this, selector, false);
        }
    };

    Object.defineProperty(element, "innerHTML", {
        get() {
            return element._innerHTML;
        },
        set(nextValue) {
            element._innerHTML = String(nextValue);
            element.children = [];

            if (element.dataset.itemList) {
                parseProductivityListHTML(element, element._innerHTML);
            }
        }
    });

    return element;
}

function getDescendants(node) {
    const descendants = [];

    node.children.forEach(child => {
        descendants.push(child, ...getDescendants(child));
    });

    return descendants;
}

function matchesSelector(element, selector) {
    const trimmed = selector.trim();
    if (!trimmed) return false;

    if (trimmed.includes(",")) {
        return trimmed.split(",").some(part => matchesSelector(element, part));
    }

    if (trimmed.startsWith("#")) {
        return element.id === trimmed.slice(1);
    }

    const requiresChecked = trimmed.endsWith(":checked");
    const selectorBody = requiresChecked ? trimmed.slice(0, -8) : trimmed;

    const tagAndAttributeMatch = selectorBody.match(/^([a-zA-Z]+)?((?:\[[^\]]+\])*)$/);
    if (!tagAndAttributeMatch) {
        return false;
    }

    const [, tagName, attributeSelector] = tagAndAttributeMatch;

    if (tagName && element.tagName !== tagName.toUpperCase()) {
        return false;
    }

    if (requiresChecked && !element.checked) {
        return false;
    }

    if (!attributeSelector) {
        return true;
    }

    const attributeMatches = [...attributeSelector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)];
    if (!attributeMatches.length) {
        return false;
    }

    return attributeMatches.every(([, rawAttribute, expectedValue]) => {
        let actualValue = null;

        if (rawAttribute.startsWith("data-")) {
            actualValue = element.dataset[toDatasetKey(rawAttribute)];
        } else if (rawAttribute === "name") {
            actualValue = element.name;
        } else if (rawAttribute === "disabled") {
            actualValue = element.disabled ? "" : null;
        } else {
            actualValue = element.getAttribute(rawAttribute);
        }

        if (typeof expectedValue === "undefined") {
            return actualValue !== null && typeof actualValue !== "undefined";
        }

        return actualValue === expectedValue;
    });
}

function queryWithin(root, selector, firstOnly) {
    const trimmed = selector.trim();
    if (!trimmed) {
        return firstOnly ? null : [];
    }

    if (trimmed.includes(",")) {
        const results = [];
        trimmed.split(",").map(part => part.trim()).forEach(part => {
            queryWithin(root, part, false).forEach(match => {
                if (!results.includes(match)) {
                    results.push(match);
                }
            });
        });
        return firstOnly ? (results[0] || null) : results;
    }

    const descendantMatch = trimmed.match(/^(.+)\s+(.+)$/);
    if (descendantMatch) {
        const [, ancestorSelector, childSelector] = descendantMatch;
        const results = [];
        queryWithin(root, ancestorSelector, false).forEach(ancestor => {
            queryWithin(ancestor, childSelector, false).forEach(match => {
                if (!results.includes(match)) {
                    results.push(match);
                }
            });
        });
        return firstOnly ? (results[0] || null) : results;
    }

    const matches = getDescendants(root).filter(element => matchesSelector(element, trimmed));
    return firstOnly ? (matches[0] || null) : matches;
}

function parseProductivityListHTML(listElement, html) {
    const itemPattern = /<li class="([^"]*)" data-item-id="([^"]+)" data-item-type="([^"]+)">([\s\S]*?)<\/li>/g;
    let match = itemPattern.exec(html);

    while (match) {
        const [, classAttr, itemId, itemType, body] = match;
        const itemElement = createElement({
            tagName: "li",
            dataset: {
                itemId,
                itemType
            },
            classNames: classAttr.split(/\s+/).filter(Boolean)
        });

        const actionPattern = /data-action="([^"]+)"/g;
        let actionMatch = actionPattern.exec(body);
        while (actionMatch) {
            itemElement.appendChild(createElement({
                tagName: "button",
                dataset: { action: actionMatch[1] }
            }));
            actionMatch = actionPattern.exec(body);
        }

        if (body.includes('data-action="toggle-complete"')) {
            itemElement.appendChild(createElement({
                tagName: "input",
                attributes: { type: "checkbox" },
                dataset: { action: "toggle-complete" },
                checked: body.includes("data-action=\"toggle-complete\"") && body.includes("checked")
            }));
        }

        if (body.includes('data-edit-field="todo"')) {
            const titleValue = body.match(/name="title"[\s\S]*?value="([^"]*)"/)?.[1] || "";
            const descriptionValue = body.match(/name="description"[\s\S]*?>([\s\S]*?)<\/textarea>/)?.[1] || "";
            const priorityValue = body.match(/name="priority" value="(LOW|MEDIUM|HIGH)" checked/)?.[1]
                || body.match(/<option value="(LOW|MEDIUM|HIGH)" selected>/)?.[1]
                || "LOW";
            const deadlineValue = body.match(/name="deadline"[\s\S]*?value="([^"]*)"/)?.[1] || "";
            const deadlineEnabled = /data-deadline-toggle[\s\S]*?checked/.test(body);
            const completedChecked = /name="isDone"[\s\S]*?checked/.test(body);

            itemElement.appendChild(createElement({
                tagName: "input",
                name: "title",
                dataset: { editField: "todo" },
                value: decodeHtml(titleValue)
            }));
            itemElement.appendChild(createElement({
                tagName: "textarea",
                name: "description",
                value: decodeHtml(descriptionValue)
            }));
            ["LOW", "MEDIUM", "HIGH"].forEach(priority => {
                itemElement.appendChild(createElement({
                    tagName: "input",
                    name: "priority",
                    attributes: { type: "radio" },
                    value: priority,
                    checked: priority === priorityValue
                }));
            });
            itemElement.appendChild(createElement({
                tagName: "input",
                attributes: { type: "checkbox" },
                dataset: { deadlineToggle: "" },
                checked: deadlineEnabled
            }));
            itemElement.appendChild(createElement({
                tagName: "input",
                name: "deadline",
                attributes: { type: "datetime-local" },
                value: decodeHtml(deadlineValue),
                disabled: !deadlineEnabled
            }));
            itemElement.appendChild(createElement({
                tagName: "input",
                name: "isDone",
                attributes: { type: "checkbox" },
                checked: completedChecked
            }));
            itemElement.appendChild(createElement({
                tagName: "p",
                dataset: { editMessage: "" },
                classNames: ["hidden"]
            }));
        }

        if (body.includes('data-edit-field="notes"')) {
            const textareaValue = body.match(/name="content"[\s\S]*?>([\s\S]*?)<\/textarea>/)?.[1] || "";
            itemElement.appendChild(createElement({
                tagName: "textarea",
                name: "content",
                dataset: { editField: "notes" },
                value: decodeHtml(textareaValue)
            }));
            itemElement.appendChild(createElement({
                tagName: "p",
                dataset: { editMessage: "" },
                classNames: ["hidden"]
            }));
        }

        listElement.appendChild(itemElement);
        match = itemPattern.exec(html);
    }
}

function createDocument(elements) {
    const documentTarget = createEventTarget();
    const roots = [...elements];
    const rootNode = { children: roots };

    return {
        ...documentTarget,
        getElementById(id) {
            return [rootNode, ...roots].flatMap(node => getDescendants(node)).find(element => element.id === id) || null;
        },
        querySelector(selector) {
            return queryWithin(rootNode, selector, true);
        },
        querySelectorAll(selector) {
            return queryWithin(rootNode, selector, false);
        }
    };
}

function createFetchResponse(status, body = null) {
    return {
        ok: status >= 200 && status < 300,
        status,
        async text() {
            if (body === null || typeof body === "undefined") {
                return "";
            }
            return typeof body === "string" ? body : JSON.stringify(body);
        }
    };
}

function createApiRuntimeState({ todos = [], notes = [], failures = {} } = {}) {
    const serverState = {
        todos: todos.map(todo => ({ ...todo })),
        notes: notes.map(note => ({ ...note })),
        failures,
        nextTodoId: todos.reduce((max, todo) => Math.max(max, Number(todo.todoId || 0)), 0) + 1,
        nextNoteId: notes.reduce((max, note) => Math.max(max, Number(note.noteId || 0)), 0) + 1,
        requests: []
    };

    async function fetch(url, options = {}) {
        const method = String(options.method || "GET").toUpperCase();
        const key = `${method} ${url}`;
        serverState.requests.push({
            method,
            url,
            body: options.body ? JSON.parse(options.body) : null
        });

        const forcedFailure = serverState.failures[key];
        if (forcedFailure) {
            return createFetchResponse(forcedFailure.status, forcedFailure.body);
        }

        if (method === "GET" && url === "/api/productivity/todos") {
            return createFetchResponse(200, serverState.todos);
        }

        if (method === "GET" && url === "/api/productivity/notes") {
            return createFetchResponse(200, serverState.notes);
        }

        if (method === "POST" && url === "/api/productivity/todos") {
            const payload = JSON.parse(options.body);
            const nextTodo = {
                todoId: serverState.nextTodoId++,
                title: payload.title,
                description: payload.description,
                isDone: Boolean(payload.isDone),
                priority: payload.priority,
                deadline: payload.deadline,
                createdAt: "2099-04-08T10:00:00",
                message: "Task was created successfully"
            };
            serverState.todos = [nextTodo, ...serverState.todos];
            return createFetchResponse(200, nextTodo);
        }

        if (method === "POST" && url === "/api/productivity/notes") {
            const payload = JSON.parse(options.body);
            const nextNote = {
                noteId: serverState.nextNoteId++,
                noteText: payload.noteText,
                message: "Note was created successfully"
            };
            serverState.notes = [nextNote, ...serverState.notes];
            return createFetchResponse(200, nextNote);
        }

        const todoIdMatch = url.match(/^\/api\/productivity\/todos\/(\d+)$/);
        if (todoIdMatch && method === "PATCH") {
            const todoId = Number(todoIdMatch[1]);
            const payload = JSON.parse(options.body);
            let updatedTodo = null;
            serverState.todos = serverState.todos.map(todo => {
                if (Number(todo.todoId) !== todoId) return todo;
                updatedTodo = {
                    ...todo,
                    title: payload.title,
                    description: payload.description,
                    isDone: Boolean(payload.isDone),
                    priority: payload.priority,
                    deadline: payload.deadline,
                    message: "Task was updated successfully"
                };
                return updatedTodo;
            });
            return createFetchResponse(200, updatedTodo);
        }

        const todoCompletionMatch = url.match(/^\/api\/productivity\/todos\/(\d+)\/completion$/);
        if (todoCompletionMatch && method === "PATCH") {
            const todoId = Number(todoCompletionMatch[1]);
            const payload = JSON.parse(options.body);
            let updatedTodo = null;
            serverState.todos = serverState.todos.map(todo => {
                if (Number(todo.todoId) !== todoId) return todo;
                updatedTodo = {
                    ...todo,
                    isDone: Boolean(payload.isDone),
                    message: "Task was updated successfully"
                };
                return updatedTodo;
            });
            return createFetchResponse(200, updatedTodo);
        }

        if (todoIdMatch && method === "DELETE") {
            const todoId = Number(todoIdMatch[1]);
            serverState.todos = serverState.todos.filter(todo => Number(todo.todoId) !== todoId);
            return createFetchResponse(200, null);
        }

        const noteIdMatch = url.match(/^\/api\/productivity\/notes\/(\d+)$/);
        if (noteIdMatch && method === "PATCH") {
            const noteId = Number(noteIdMatch[1]);
            const payload = JSON.parse(options.body);
            let updatedNote = null;
            serverState.notes = serverState.notes.map(note => {
                if (Number(note.noteId) !== noteId) return note;
                updatedNote = {
                    ...note,
                    noteText: payload.noteText,
                    message: "Note was updated successfully"
                };
                return updatedNote;
            });
            return createFetchResponse(200, updatedNote);
        }

        if (noteIdMatch && method === "DELETE") {
            const noteId = Number(noteIdMatch[1]);
            serverState.notes = serverState.notes.filter(note => Number(note.noteId) !== noteId);
            return createFetchResponse(200, null);
        }

        return createFetchResponse(404, { message: `Unhandled route: ${key}` });
    }

    return {
        serverState,
        fetch
    };
}

export async function flushAsyncWork() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
    await Promise.resolve();
}

export async function bootstrapProductivityRuntime(options = {}) {
    const { todos = [], notes = [], failures = {} } = options;
    const api = createApiRuntimeState({ todos, notes, failures });

    const csrfMeta = createElement({
        tagName: "meta",
        name: "_csrf",
        attributes: { name: "_csrf", content: "csrf-token" },
        content: "csrf-token"
    });
    const csrfHeaderMeta = createElement({
        tagName: "meta",
        name: "_csrf_header",
        attributes: { name: "_csrf_header", content: "X-CSRF-TOKEN" },
        content: "X-CSRF-TOKEN"
    });

    const todoTitleInput = createElement({ tagName: "input", id: "todoInput", name: "title" });
    const todoDescriptionInput = createElement({ tagName: "textarea", id: "todoDescriptionInput", name: "description" });
    const todoPriorityLowInput = createElement({
        tagName: "input",
        name: "priority",
        attributes: { type: "radio", value: "LOW" },
        value: "LOW"
    });
    const todoPriorityMediumInput = createElement({
        tagName: "input",
        name: "priority",
        attributes: { type: "radio", value: "MEDIUM" },
        value: "MEDIUM"
    });
    const todoPriorityHighInput = createElement({
        tagName: "input",
        name: "priority",
        attributes: { type: "radio", value: "HIGH" },
        value: "HIGH",
        checked: true
    });
    const todoDeadlineToggle = createElement({
        tagName: "input",
        attributes: { type: "checkbox" },
        dataset: { deadlineToggle: "" }
    });
    const todoDeadlineInput = createElement({
        tagName: "input",
        id: "todoDeadlineInput",
        name: "deadline",
        attributes: { type: "datetime-local" },
        disabled: true
    });
    const noteInput = createElement({ tagName: "textarea", id: "noteInput", name: "content" });
    const activeCount = createElement({ tagName: "span", dataset: { activeCount: "" } });

    const todoMessage = createElement({ dataset: { formMessage: "todo" }, classNames: ["hidden"] });
    const noteMessage = createElement({ dataset: { formMessage: "notes" }, classNames: ["hidden"] });

    const todoFormToggle = createElement({ tagName: "div", dataset: { formToggle: "" } });
    const noteFormToggle = createElement({ tagName: "div", dataset: { formToggle: "" } });
    const todoForm = createElement({
        tagName: "form",
        dataset: { entryForm: "todo" },
        classNames: ["productivity-entry-form", "productivity-entry-form--collapsed"]
    });
    todoForm.appendChild(todoFormToggle);
    todoForm.appendChild(todoTitleInput);
    todoForm.appendChild(todoDescriptionInput);
    todoForm.appendChild(todoPriorityLowInput);
    todoForm.appendChild(todoPriorityMediumInput);
    todoForm.appendChild(todoPriorityHighInput);
    todoForm.appendChild(todoDeadlineToggle);
    todoForm.appendChild(todoDeadlineInput);
    todoForm.appendChild(todoMessage);

    const notesForm = createElement({
        tagName: "form",
        dataset: { entryForm: "notes" },
        classNames: ["productivity-entry-form", "productivity-entry-form--collapsed"]
    });
    notesForm.appendChild(noteFormToggle);
    notesForm.appendChild(noteInput);
    notesForm.appendChild(noteMessage);

    const todoList = createElement({ tagName: "ul", dataset: { itemList: "todo" } });
    const notesList = createElement({ tagName: "ul", dataset: { itemList: "notes" } });
    const todoEmpty = createElement({ dataset: { emptyState: "todo" } });
    const notesEmpty = createElement({ dataset: { emptyState: "notes" } });

    const todoPanel = createElement({
        id: "productivity-panel-todo",
        dataset: { tabPanel: "todo" },
        classNames: ["productivity-panel"],
        attributes: { "aria-hidden": "false" }
    });
    todoPanel.appendChild(todoForm);
    todoPanel.appendChild(activeCount);
    todoPanel.appendChild(todoList);
    todoPanel.appendChild(todoEmpty);

    const notesPanel = createElement({
        id: "productivity-panel-notes",
        dataset: { tabPanel: "notes" },
        classNames: ["productivity-panel", "hidden"],
        attributes: { "aria-hidden": "true" }
    });
    notesPanel.appendChild(notesForm);
    notesPanel.appendChild(notesList);
    notesPanel.appendChild(notesEmpty);

    const todoTab = createElement({
        tagName: "button",
        id: "productivity-tab-todo",
        dataset: { tabTrigger: "todo" },
        classNames: ["productivity-tab", "productivity-tab--active"],
        attributes: {
            "aria-selected": "true",
            "aria-controls": "productivity-panel-todo"
        }
    });
    todoTab.tabIndex = 0;

    const notesTab = createElement({
        tagName: "button",
        id: "productivity-tab-notes",
        dataset: { tabTrigger: "notes" },
        classNames: ["productivity-tab"],
        attributes: {
            "aria-selected": "false",
            "aria-controls": "productivity-panel-notes"
        }
    });
    notesTab.tabIndex = -1;

    const document = createDocument([
        csrfMeta,
        csrfHeaderMeta,
        todoTab,
        notesTab,
        todoPanel,
        notesPanel
    ]);
    const windowTarget = createEventTarget();

    const context = {
        console: {
            warn() {},
            log() {},
            error() {}
        },
        document,
        window: null,
        location: {
            href: "https://teclos.space/productivity",
            pathname: "/productivity"
        },
        fetch: api.fetch,
        Date,
        Math,
        JSON,
        Number,
        String,
        Boolean,
        Object,
        Array,
        Intl,
        Promise,
        setTimeout,
        clearTimeout,
        addEventListener(...args) {
            return windowTarget.addEventListener(...args);
        },
        dispatchEvent(...args) {
            return windowTarget.dispatchEvent(...args);
        }
    };

    context.window = context;
    vm.createContext(context);

    const source = readFileSync(path.resolve("src/main/resources/static/js/productivity.js"), "utf8");
    vm.runInContext(source, context, { filename: "productivity.js" });
    document.dispatchEvent({ type: "DOMContentLoaded", target: document });
    await flushAsyncWork();

    return {
        window: context,
        document,
        serverState: api.serverState,
        tabs: {
            todo: todoTab,
            notes: notesTab
        },
        panels: {
            todo: todoPanel,
            notes: notesPanel
        },
        forms: {
            todo: todoForm,
            notes: notesForm
        },
        inputs: {
            todo: {
                title: todoTitleInput,
                description: todoDescriptionInput,
                priority: todoPriorityHighInput,
                priorityOptions: {
                    LOW: todoPriorityLowInput,
                    MEDIUM: todoPriorityMediumInput,
                    HIGH: todoPriorityHighInput
                },
                deadlineToggle: todoDeadlineToggle,
                deadline: todoDeadlineInput
            },
            notes: noteInput
        },
        lists: {
            todo: todoList,
            notes: notesList
        },
        emptyStates: {
            todo: todoEmpty,
            notes: notesEmpty
        },
        messages: {
            todo: todoMessage,
            notes: noteMessage
        },
        activeCount
    };
}

export async function submitForm(runtime, type) {
    runtime.forms[type].dispatchEvent({
        type: "submit",
        target: runtime.forms[type]
    });
    await flushAsyncWork();
}

export function inputValue(runtime, type, field, value) {
    const input = type === "notes" ? runtime.inputs.notes : runtime.inputs.todo[field];
    if (type === "todo" && field === "priority") {
        Object.entries(runtime.inputs.todo.priorityOptions).forEach(([priority, option]) => {
            option.checked = priority === value;
        });
        runtime.forms.todo.dispatchEvent({
            type: "input",
            target: runtime.inputs.todo.priorityOptions[value]
        });
        return;
    }

    if (type === "todo" && field === "deadline") {
        runtime.inputs.todo.deadlineToggle.checked = Boolean(value);
        runtime.inputs.todo.deadline.disabled = !value;
    }

    input.value = value;
    const ownerForm = type === "notes" ? runtime.forms.notes : runtime.forms.todo;
    ownerForm.dispatchEvent({
        type: "input",
        target: input
    });
}

export async function clickListAction(runtime, type, itemId, action) {
    const actionElement = runtime.lists[type].querySelector(`[data-item-id="${itemId}"] [data-action="${action}"]`);
    runtime.lists[type].dispatchEvent({
        type: "click",
        target: actionElement
    });
    await flushAsyncWork();
}

export async function toggleTodo(runtime, itemId, checked) {
    const checkbox = runtime.lists.todo.querySelector(`[data-item-id="${itemId}"] [data-action="toggle-complete"]`);
    checkbox.checked = checked;
    runtime.lists.todo.dispatchEvent({
        type: "change",
        target: checkbox
    });
    await flushAsyncWork();
}

export async function triggerEditorKey(runtime, type, itemId, {
    key = "Enter",
    ctrlKey = false,
    metaKey = false,
    editorSelector
} = {}) {
    const selector = editorSelector || `[data-item-id="${itemId}"] [data-edit-field="${type}"]`;
    const editor = runtime.lists[type].querySelector(selector);
    runtime.lists[type].dispatchEvent({
        type: "keydown",
        key,
        ctrlKey,
        metaKey,
        target: editor
    });
    await flushAsyncWork();
}

export function getTodoItems(runtime) {
    return runtime.serverState.todos.map(todo => ({
        ...todo
    }));
}

export function getNoteItems(runtime) {
    return runtime.serverState.notes.map(note => ({
        ...note
    }));
}
