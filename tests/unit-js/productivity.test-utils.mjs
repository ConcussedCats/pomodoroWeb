import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { createLocalStorage } from "./timer-state.test-utils.mjs";

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
        },
        toArray() {
            return [...classes];
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
    checked = false
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
            if (key === "id") {
                this.id = safeValue;
            }
            if (key === "name") {
                this.name = safeValue;
            }
            if (key.startsWith("data-")) {
                this.dataset[toDatasetKey(key)] = safeValue;
            }
        },
        getAttribute(key) {
            if (key.startsWith("data-")) {
                const dataValue = this.dataset[toDatasetKey(key)];
                return typeof dataValue === "string" ? dataValue : null;
            }

            if (key === "name" && this.name) {
                return this.name;
            }

            return attributeMap.has(key) ? attributeMap.get(key) : null;
        },
        removeAttribute(key) {
            attributeMap.delete(key);
            if (key.startsWith("data-")) {
                delete this.dataset[toDatasetKey(key)];
            }
        },
        focus() {
            this.wasFocused = true;
        },
        reset() {
            getDescendants(this).forEach(descendant => {
                if (descendant.tagName === "INPUT" || descendant.tagName === "TEXTAREA") {
                    descendant.value = "";
                    descendant.checked = false;
                }
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
                if (current === this) {
                    return true;
                }
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

    if (!trimmed) {
        return false;
    }

    if (trimmed.includes(",")) {
        return trimmed.split(",").some(part => matchesSelector(element, part));
    }

    if (trimmed.startsWith("#")) {
        return element.id === trimmed.slice(1);
    }

    if (trimmed === "input" || trimmed === "textarea") {
        return element.tagName === trimmed.toUpperCase();
    }

    const attributeMatch = trimmed.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (!attributeMatch) {
        return false;
    }

    const [, rawAttribute, expectedValue] = attributeMatch;
    let actualValue = null;

    if (rawAttribute.startsWith("data-")) {
        actualValue = element.dataset[toDatasetKey(rawAttribute)];
    } else if (rawAttribute === "name") {
        actualValue = element.name;
    } else {
        actualValue = element.getAttribute(rawAttribute);
    }

    if (typeof expectedValue === "undefined") {
        return actualValue !== null && typeof actualValue !== "undefined";
    }

    return actualValue === expectedValue;
}

function queryWithin(root, selector, firstOnly) {
    const trimmed = selector.trim();
    if (!trimmed) {
        return firstOnly ? null : [];
    }

    if (trimmed.includes(",")) {
        const results = [];
        trimmed.split(",").map(part => part.trim()).forEach(part => {
            const matched = queryWithin(root, part, false);
            matched.forEach(element => {
                if (!results.includes(element)) {
                    results.push(element);
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
                dataset: {
                    action: actionMatch[1]
                }
            }));
            actionMatch = actionPattern.exec(body);
        }

        const editFieldMatch = body.match(/data-edit-field="([^"]+)"/);
        if (editFieldMatch) {
            if (editFieldMatch[1] === "todo") {
                const valueMatch = body.match(/value="([^"]*)"/);
                itemElement.appendChild(createElement({
                    tagName: "input",
                    name: "text",
                    dataset: {
                        editField: "todo"
                    },
                    value: decodeHtml(valueMatch?.[1] || "")
                }));
            } else {
                const textareaMatch = body.match(/<textarea[\s\S]*?>([\s\S]*?)<\/textarea>/);
                itemElement.appendChild(createElement({
                    tagName: "textarea",
                    name: "content",
                    dataset: {
                        editField: "notes"
                    },
                    value: decodeHtml(textareaMatch?.[1] || "")
                }));
            }
        }

        if (body.includes('data-action="toggle-complete"')) {
            const checkbox = createElement({
                tagName: "input",
                dataset: {
                    action: "toggle-complete"
                },
                checked: body.includes("checked")
            });
            itemElement.appendChild(checkbox);
        }

        listElement.appendChild(itemElement);
        match = itemPattern.exec(html);
    }
}

function createDocument(elements) {
    const documentTarget = createEventTarget();
    const roots = [...elements];
    const rootNode = {
        children: roots
    };

    return {
        ...documentTarget,
        getElementById(id) {
            return roots.find(element => element.id === id) || null;
        },
        querySelector(selector) {
            return queryWithin(rootNode, selector, true);
        },
        querySelectorAll(selector) {
            return queryWithin(rootNode, selector, false);
        }
    };
}

export function bootstrapProductivityRuntime({ localStorage } = {}) {
    const sharedStorage = localStorage || createLocalStorage();
    const nextUuid = (() => {
        let count = 0;
        return () => {
            count += 1;
            return `test-uuid-${count}`;
        };
    })();

    const todoInput = createElement({ tagName: "input", id: "todoInput", name: "text" });
    const noteInput = createElement({ tagName: "textarea", id: "noteInput", name: "content" });
    const todoMessage = createElement({ dataset: { formMessage: "todo" }, classNames: ["hidden"] });
    const noteMessage = createElement({ dataset: { formMessage: "notes" }, classNames: ["hidden"] });

    const todoForm = createElement({ tagName: "form", dataset: { entryForm: "todo" } });
    todoForm.appendChild(todoInput);
    todoForm.appendChild(todoMessage);

    const notesForm = createElement({ tagName: "form", dataset: { entryForm: "notes" } });
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
        attributes: {
            "aria-hidden": "false"
        }
    });
    todoPanel.appendChild(todoForm);
    todoPanel.appendChild(todoList);
    todoPanel.appendChild(todoEmpty);

    const notesPanel = createElement({
        id: "productivity-panel-notes",
        dataset: { tabPanel: "notes" },
        classNames: ["productivity-panel", "hidden"],
        attributes: {
            "aria-hidden": "true"
        }
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

    const document = createDocument([todoTab, notesTab, todoPanel, notesPanel]);
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
        localStorage: sharedStorage,
        crypto: {
            randomUUID: nextUuid
        },
        Date,
        Math,
        JSON,
        Number,
        String,
        Boolean,
        Object,
        Array,
        Intl,
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

    return {
        window: context,
        document,
        localStorage: sharedStorage,
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
            todo: todoInput,
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
        }
    };
}

export function submitForm(runtime, type) {
    runtime.forms[type].dispatchEvent({
        type: "submit",
        target: runtime.forms[type]
    });
}

export function inputValue(runtime, type, value) {
    runtime.inputs[type].value = value;
    runtime.forms[type].dispatchEvent({
        type: "input",
        target: runtime.inputs[type]
    });
}

export function clickListAction(runtime, type, itemId, action) {
    const actionElement = runtime.lists[type].querySelector(`[data-item-id="${itemId}"] [data-action="${action}"]`);
    runtime.lists[type].dispatchEvent({
        type: "click",
        target: actionElement
    });
}

export function toggleTodo(runtime, itemId, checked) {
    const checkbox = runtime.lists.todo.querySelector(`[data-item-id="${itemId}"] [data-action="toggle-complete"]`);
    checkbox.checked = checked;
    runtime.lists.todo.dispatchEvent({
        type: "change",
        target: checkbox
    });
}

export function triggerEditorKey(runtime, type, itemId, {
    key = "Enter",
    ctrlKey = false,
    metaKey = false
} = {}) {
    const editor = runtime.lists[type].querySelector(`[data-item-id="${itemId}"] [data-edit-field="${type}"]`);
    runtime.lists[type].dispatchEvent({
        type: "keydown",
        key,
        ctrlKey,
        metaKey,
        target: editor
    });
}

export function getStoredProductivityState(runtime) {
    const raw = runtime.localStorage.getItem("telos.productivity.v1");
    return raw ? JSON.parse(raw) : null;
}

export function dispatchStorageSync(runtime) {
    runtime.window.dispatchEvent({
        type: "storage",
        key: "telos.productivity.v1"
    });
}
