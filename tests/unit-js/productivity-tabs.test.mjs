import assert from "node:assert/strict";
import test from "node:test";

import { bootstrapProductivityRuntime } from "./productivity.test-utils.mjs";

test("productivity page renders the available tabs and keeps todo active by default", () => {
    const runtime = bootstrapProductivityRuntime();

    assert.ok(runtime.tabs.todo);
    assert.ok(runtime.tabs.notes);

    assert.equal(runtime.tabs.todo.classList.contains("productivity-tab--active"), true);
    assert.equal(runtime.tabs.todo.getAttribute("aria-selected"), "true");
    assert.equal(runtime.tabs.notes.classList.contains("productivity-tab--active"), false);
    assert.equal(runtime.tabs.notes.getAttribute("aria-selected"), "false");

    assert.equal(runtime.panels.todo.classList.contains("hidden"), false);
    assert.equal(runtime.panels.todo.getAttribute("aria-hidden"), "false");
    assert.equal(runtime.panels.notes.classList.contains("hidden"), true);
    assert.equal(runtime.panels.notes.getAttribute("aria-hidden"), "true");
});

test("switching tabs updates active state and shows the matching panel without route navigation", () => {
    const runtime = bootstrapProductivityRuntime();
    const originalPath = runtime.window.location.pathname;

    runtime.tabs.notes.dispatchEvent({
        type: "click",
        target: runtime.tabs.notes
    });

    assert.equal(runtime.window.location.pathname, originalPath);
    assert.equal(runtime.tabs.notes.classList.contains("productivity-tab--active"), true);
    assert.equal(runtime.tabs.notes.getAttribute("aria-selected"), "true");
    assert.equal(runtime.tabs.notes.tabIndex, 0);
    assert.equal(runtime.tabs.todo.classList.contains("productivity-tab--active"), false);
    assert.equal(runtime.tabs.todo.getAttribute("aria-selected"), "false");
    assert.equal(runtime.tabs.todo.tabIndex, -1);

    assert.equal(runtime.panels.notes.classList.contains("hidden"), false);
    assert.equal(runtime.panels.notes.getAttribute("aria-hidden"), "false");
    assert.equal(runtime.panels.todo.classList.contains("hidden"), true);
    assert.equal(runtime.panels.todo.getAttribute("aria-hidden"), "true");
});

test("switching back to todo restores the original active state and keeps the page shell intact", () => {
    const runtime = bootstrapProductivityRuntime();

    runtime.tabs.notes.dispatchEvent({
        type: "click",
        target: runtime.tabs.notes
    });
    runtime.tabs.todo.dispatchEvent({
        type: "click",
        target: runtime.tabs.todo
    });

    assert.equal(runtime.tabs.todo.classList.contains("productivity-tab--active"), true);
    assert.equal(runtime.tabs.notes.classList.contains("productivity-tab--active"), false);
    assert.equal(runtime.panels.todo.classList.contains("hidden"), false);
    assert.equal(runtime.panels.notes.classList.contains("hidden"), true);
    assert.equal(runtime.tabs.todo.getAttribute("aria-controls"), "productivity-panel-todo");
    assert.equal(runtime.tabs.notes.getAttribute("aria-controls"), "productivity-panel-notes");
});
