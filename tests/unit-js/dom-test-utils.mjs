import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

function toDatasetKey(attribute) {
    return attribute.replace(/^data-/, "").replace(/-([a-z])/g, (_, char) => char.toUpperCase());
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
            safeEvent.target ??= this;
            safeEvent.currentTarget = this;
            safeEvent.defaultPrevented = false;
            safeEvent.preventDefault ??= () => {
                safeEvent.defaultPrevented = true;
            };
            safeEvent.stopPropagation ??= () => {};

            const callbacks = listeners.get(safeEvent.type) || [];
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

export function createElement({
    tagName = "div",
    id = "",
    name = "",
    dataset = {},
    attributes = {},
    classNames = [],
    value = "",
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
        textContent: content,
        value,
        disabled,
        style: {},
        tabIndex: 0,
        appendChild(child) {
            child.parentNode = this;
            this.children.push(child);
            return child;
        },
        querySelector(selector) {
            return queryWithin(this, selector, true);
        },
        querySelectorAll(selector) {
            return queryWithin(this, selector, false);
        },
        setAttribute(key, nextValue) {
            const safeValue = String(nextValue);
            attributeMap.set(key, safeValue);
            if (key === "id") this.id = safeValue;
            if (key === "name") this.name = safeValue;
            if (key === "content") this.content = safeValue;
            if (key.startsWith("data-")) {
                this.dataset[toDatasetKey(key)] = safeValue;
            }
        },
        getAttribute(key) {
            if (key.startsWith("data-")) {
                const value = this.dataset[toDatasetKey(key)];
                return typeof value === "string" ? value : null;
            }
            if (key === "name" && this.name) return this.name;
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
        reset() {
            getDescendants(this).forEach(descendant => {
                if (descendant.tagName === "INPUT" || descendant.tagName === "TEXTAREA") {
                    descendant.value = "";
                }
            });
        }
    };

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

    if (trimmed.startsWith(".")) {
        return element.classList.contains(trimmed.slice(1));
    }

    const attrMatch = trimmed.match(/^(?:([a-zA-Z]+))?\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (attrMatch) {
        const [, tagName, rawAttribute, expectedValue] = attrMatch;
        if (tagName && element.tagName !== tagName.toUpperCase()) {
            return false;
        }

        let actualValue = null;
        if (rawAttribute.startsWith("data-")) {
            actualValue = element.dataset[toDatasetKey(rawAttribute)];
        } else if (rawAttribute === "name") {
            actualValue = element.name;
        } else if (rawAttribute === "content") {
            actualValue = element.content;
        } else {
            actualValue = element.getAttribute(rawAttribute);
        }

        if (typeof expectedValue === "undefined") {
            return actualValue !== null && typeof actualValue !== "undefined";
        }

        return actualValue === expectedValue;
    }

    return element.tagName === trimmed.toUpperCase();
}

function queryWithin(root, selector, firstOnly) {
    const trimmed = selector.trim();
    if (!trimmed) {
        return firstOnly ? null : [];
    }

    if (trimmed.includes(",")) {
        const results = [];
        trimmed.split(",").map(part => part.trim()).forEach(part => {
            queryWithin(root, part, false).forEach(element => {
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
            queryWithin(ancestor, childSelector, false).forEach(element => {
                if (!results.includes(element)) {
                    results.push(element);
                }
            });
        });
        return firstOnly ? (results[0] || null) : results;
    }

    const matches = getDescendants(root).filter(element => matchesSelector(element, trimmed));
    return firstOnly ? (matches[0] || null) : matches;
}

export function createDocument(roots) {
    const documentTarget = createEventTarget();
    const rootNode = { children: roots };

    return {
        ...documentTarget,
        getElementById(id) {
            return roots.find(root => root.id === id) || null;
        },
        querySelector(selector) {
            return queryWithin(rootNode, selector, true);
        },
        querySelectorAll(selector) {
            return queryWithin(rootNode, selector, false);
        }
    };
}

export function runBrowserScript(scriptPath, context) {
    const source = readFileSync(path.resolve(scriptPath), "utf8");
    vm.createContext(context);
    vm.runInContext(source, context, { filename: path.basename(scriptPath) });
}
