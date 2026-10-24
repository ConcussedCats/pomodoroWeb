// Small fake DOM for running page scripts (devices.js, history.js, ble-provisioning.js) in node:vm.
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

function toDatasetKey(name) {
    return name.replace(/^data-/, "").replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

class FakeClassList {
    constructor(element) {
        this.element = element;
        this.tokens = new Set();
    }

    add(...tokens) {
        tokens.forEach(token => this.tokens.add(token));
    }

    remove(...tokens) {
        tokens.forEach(token => this.tokens.delete(token));
    }

    toggle(token, force) {
        const shouldHave = typeof force === "boolean" ? force : !this.tokens.has(token);
        if (shouldHave) {
            this.tokens.add(token);
        } else {
            this.tokens.delete(token);
        }
        return shouldHave;
    }

    contains(token) {
        return this.tokens.has(token);
    }
}

export class FakeElement {
    constructor(tagName, ownerDocument) {
        this.tagName = tagName.toUpperCase();
        this.ownerDocument = ownerDocument;
        this.children = [];
        this.parentNode = null;
        this.attributes = new Map();
        this.dataset = {};
        this.classList = new FakeClassList(this);
        this.style = {};
        this.listeners = new Map();
        this.ownText = "";
        this.value = "";
        this.checked = false;
        this.disabled = false;
        this.type = tagName.toLowerCase() === "input" ? "text" : "";
    }

    get className() {
        return Array.from(this.classList.tokens).join(" ");
    }

    set className(value) {
        this.classList.tokens = new Set(String(value).split(/\s+/).filter(Boolean));
    }

    get textContent() {
        return this.ownText + this.children.map(child => child.textContent).join("");
    }

    set textContent(value) {
        this.children.forEach(child => {
            child.parentNode = null;
        });
        this.children = [];
        this.ownText = value === undefined || value === null ? "" : String(value);
    }

    get lastElementChild() {
        return this.children[this.children.length - 1] || null;
    }

    get elements() {
        const result = {};
        this.querySelectorAll("input, select, textarea, button").forEach((element) => {
            const name = element.name || element.getAttribute("name");
            if (name) result[name] = element;
        });
        return result;
    }

    appendChild(child) {
        if (child.parentNode) child.remove();
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    append(...nodes) {
        nodes.forEach((node) => {
            if (typeof node === "string") {
                const text = new FakeElement("#text", this.ownerDocument);
                text.ownText = node;
                this.appendChild(text);
            } else {
                this.appendChild(node);
            }
        });
    }

    replaceChildren(...nodes) {
        this.textContent = "";
        this.append(...nodes);
    }

    remove() {
        if (!this.parentNode) return;
        this.parentNode.children = this.parentNode.children.filter(child => child !== this);
        this.parentNode = null;
    }

    setAttribute(name, value) {
        const text = String(value);
        this.attributes.set(name, text);
        if (name.startsWith("data-")) this.dataset[toDatasetKey(name)] = text;
        if (name === "name") this.name = text;
        if (name === "id") this.id = text;
        if (name === "class") this.className = text;
    }

    getAttribute(name) {
        if (name.startsWith("data-")) {
            const value = this.dataset[toDatasetKey(name)];
            return value === undefined ? null : String(value);
        }
        return this.attributes.has(name) ? this.attributes.get(name) : null;
    }

    addEventListener(type, listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(listener);
    }

    removeEventListener(type, listener) {
        this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== listener));
    }

    dispatchEvent(event) {
        event.target ??= this;
        event.currentTarget = this;
        event.preventDefault ??= () => {
            event.defaultPrevented = true;
        };
        (this.listeners.get(event.type) || []).forEach(listener => listener(event));
        if (event.bubbles && this.parentNode && this.parentNode.dispatchEvent) {
            this.parentNode.dispatchEvent(event);
        }
        return !event.defaultPrevented;
    }

    click() {
        this.dispatchEvent({ type: "click", bubbles: true });
    }

    focus() {
        this.ownerDocument.activeElement = this;
    }

    blur() {
        if (this.ownerDocument.activeElement === this) {
            this.ownerDocument.activeElement = null;
            this.dispatchEvent({ type: "focusout", bubbles: true });
        }
    }

    contains(node) {
        for (let current = node; current; current = current.parentNode) {
            if (current === this) return true;
        }
        return false;
    }

    matches(selector) {
        return selector.split(",").some(part => matchesSimple(this, part.trim()));
    }

    querySelectorAll(selector) {
        const results = [];
        const walk = (node) => {
            node.children.forEach((child) => {
                if (child.matches(selector)) results.push(child);
                walk(child);
            });
        };
        walk(this);
        return results;
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }
}

function matchesSimple(element, selector) {
    if (!selector || element.tagName === "#TEXT") return false;
    const match = selector.match(/^([a-zA-Z0-9]*)((?:\.[\w-]+)*)(?:\[([\w-]+)(?:="([^"]*)")?\])?$/);
    if (!match) return false;
    const [, tag, classes, attribute, expected] = match;
    if (tag && element.tagName !== tag.toUpperCase()) return false;
    if (classes && !classes.split(".").filter(Boolean).every(name => element.classList.contains(name))) return false;
    if (attribute) {
        const actual = element.getAttribute(attribute);
        if (actual === null) return false;
        if (expected !== undefined && actual !== expected) return false;
    }
    return Boolean(tag || classes || attribute);
}

export function createPageDocument() {
    const listeners = new Map();
    const document = {
        activeElement: null,
        createElement(tag) {
            return new FakeElement(tag, document);
        },
        createElementNS(namespace, tag) {
            return new FakeElement(tag, document);
        },
        addEventListener(type, listener) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(listener);
        },
        dispatchEvent(event) {
            (listeners.get(event.type) || []).forEach(listener => listener(event));
            return true;
        }
    };
    document.body = new FakeElement("body", document);
    document.querySelector = selector => document.body.querySelector(selector);
    document.querySelectorAll = selector => document.body.querySelectorAll(selector);
    document.getElementById = id => document.body.querySelectorAll("*").find(element => element.id === id) || null;
    return document;
}

/** Appends an element with data-* hooks (e.g. { "data-devices-list": "" }) to the parent. */
export function addHook(document, parent, tag, attributes = {}) {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    parent.appendChild(element);
    return element;
}

export function jsonResponse(body, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => (body === undefined ? "" : JSON.stringify(body)),
        json: async () => body
    };
}

/** fetch fake: routes is a function (url, options) => response | undefined; every call is recorded. */
export function createFetch(routes) {
    const calls = [];
    const fetch = async (url, options = {}) => {
        calls.push({ url: String(url), options, body: options.body ? JSON.parse(options.body) : undefined });
        const response = await routes(String(url), options);
        if (!response) {
            throw new Error(`Unexpected request ${options.method || "GET"} ${url}`);
        }
        return response;
    };
    return { fetch, calls };
}

/** Manual timers so tests decide when intervals fire. */
export function createTimers() {
    let nextId = 1;
    const intervals = new Map();
    return {
        setInterval(callback) {
            const id = nextId++;
            intervals.set(id, callback);
            return id;
        },
        clearInterval(id) {
            intervals.delete(id);
        },
        setTimeout(callback) {
            callback();
            return nextId++;
        },
        clearTimeout() {},
        async runIntervals() {
            for (const callback of Array.from(intervals.values())) {
                await callback();
            }
        },
        activeCount: () => intervals.size
    };
}

export function createLiveChannel() {
    const listeners = new Set();
    return {
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        onConnection(listener) {
            listener("open");
            return () => {};
        },
        getStatus: () => "open",
        emit(message) {
            listeners.forEach(listener => listener(message));
        }
    };
}

export function createStorageSpy() {
    const writes = [];
    return {
        writes,
        getItem: () => null,
        setItem: (key, value) => writes.push({ key, value }),
        removeItem: () => {}
    };
}

export async function flush(rounds = 8) {
    for (let index = 0; index < rounds; index += 1) {
        await new Promise(resolve => setImmediate(resolve));
    }
}

export function runPageScripts(context, scripts) {
    vm.createContext(context);
    scripts.forEach((script) => {
        const filePath = path.resolve("src/main/resources/static/js", script);
        vm.runInContext(readFileSync(filePath, "utf8"), context, { filename: filePath });
    });
    context.document.dispatchEvent({ type: "DOMContentLoaded" });
}

export function baseContext(document, extras = {}) {
    const context = {
        document,
        console: { warn() {}, log() {}, error() {} },
        JSON,
        Math,
        Date,
        Number,
        String,
        Boolean,
        Object,
        Array,
        Map,
        Set,
        Promise,
        Error,
        Intl,
        TextEncoder,
        TextDecoder,
        encodeURIComponent,
        isSecureContext: true,
        location: { origin: "https://teclos.example" },
        confirm: () => true,
        ...extras
    };
    context.window = context;
    return context;
}
