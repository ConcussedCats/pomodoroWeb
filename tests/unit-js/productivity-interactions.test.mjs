import assert from "node:assert/strict";
import test from "node:test";

import {
    bootstrapProductivityRuntime,
    clickListAction,
    getStoredProductivityState,
    inputValue,
    submitForm,
    toggleTodo,
    triggerEditorKey
} from "./productivity.test-utils.mjs";

test("todo and notes empty states are visible on a fresh productivity page", () => {
    const runtime = bootstrapProductivityRuntime();

    assert.equal(runtime.emptyStates.todo.classList.contains("hidden"), false);
    assert.equal(runtime.emptyStates.notes.classList.contains("hidden"), false);
});

test("adding a valid todo item stores it, hides the empty state, and resets the form", () => {
    const runtime = bootstrapProductivityRuntime();

    runtime.inputs.todo.value = "Ship release checklist";
    submitForm(runtime, "todo");

    const stored = getStoredProductivityState(runtime);
    assert.equal(stored.todo.length, 1);
    assert.equal(stored.todo[0].text, "Ship release checklist");
    assert.equal(stored.todo[0].completed, false);
    assert.equal(runtime.emptyStates.todo.classList.contains("hidden"), true);
    assert.equal(runtime.inputs.todo.value, "");
    assert.ok(runtime.lists.todo.innerHTML.includes("Ship release checklist"));
});

test("blank todo submission marks the field invalid and shows an error message", () => {
    const runtime = bootstrapProductivityRuntime();

    runtime.inputs.todo.value = "   ";
    submitForm(runtime, "todo");

    assert.equal(runtime.inputs.todo.getAttribute("aria-invalid"), "true");
    assert.equal(runtime.messages.todo.classList.contains("hidden"), false);
    assert.ok(runtime.messages.todo.textContent.includes("Please enter a task"));

    inputValue(runtime, "todo", "Fix docs");
    assert.equal(runtime.inputs.todo.getAttribute("aria-invalid"), null);
    assert.equal(runtime.messages.todo.classList.contains("hidden"), true);
});

test("todo item supports complete, edit, save, cancel, delete, and keyboard save", () => {
    const runtime = bootstrapProductivityRuntime();

    runtime.inputs.todo.value = "Review pull request";
    submitForm(runtime, "todo");
    let stored = getStoredProductivityState(runtime);
    const itemId = stored.todo[0].id;

    toggleTodo(runtime, itemId, true);
    stored = getStoredProductivityState(runtime);
    assert.equal(stored.todo[0].completed, true);

    clickListAction(runtime, "todo", itemId, "edit");
    const todoEditor = runtime.lists.todo.querySelector(`[data-item-id="${itemId}"] [data-edit-field="todo"]`);
    assert.ok(todoEditor);
    assert.equal(todoEditor.wasFocused, true);

    todoEditor.value = "Review final pull request";
    triggerEditorKey(runtime, "todo", itemId, { key: "Enter" });
    stored = getStoredProductivityState(runtime);
    assert.equal(stored.todo[0].text, "Review final pull request");

    clickListAction(runtime, "todo", itemId, "edit");
    const secondEditor = runtime.lists.todo.querySelector(`[data-item-id="${itemId}"] [data-edit-field="todo"]`);
    secondEditor.value = "Temporary edit";
    clickListAction(runtime, "todo", itemId, "cancel-edit");
    stored = getStoredProductivityState(runtime);
    assert.equal(stored.todo[0].text, "Review final pull request");

    clickListAction(runtime, "todo", itemId, "delete");
    stored = getStoredProductivityState(runtime);
    assert.equal(stored.todo.length, 0);
    assert.equal(runtime.emptyStates.todo.classList.contains("hidden"), false);
});

test("adding and editing notes preserves content, supports keyboard save modifiers, and escapes HTML", () => {
    const runtime = bootstrapProductivityRuntime();

    runtime.tabs.notes.dispatchEvent({
        type: "click",
        target: runtime.tabs.notes
    });
    runtime.inputs.notes.value = "Line one\n<script>alert(1)</script>";
    submitForm(runtime, "notes");

    let stored = getStoredProductivityState(runtime);
    const itemId = stored.notes[0].id;
    assert.equal(stored.notes.length, 1);
    assert.equal(runtime.emptyStates.notes.classList.contains("hidden"), true);
    assert.ok(runtime.lists.notes.innerHTML.includes("Line one<br>&lt;script&gt;alert(1)&lt;/script&gt;"));

    clickListAction(runtime, "notes", itemId, "edit");
    const noteEditor = runtime.lists.notes.querySelector(`[data-item-id="${itemId}"] [data-edit-field="notes"]`);
    assert.ok(noteEditor);

    noteEditor.value = "Updated note";
    triggerEditorKey(runtime, "notes", itemId, { key: "Enter" });
    stored = getStoredProductivityState(runtime);
    assert.equal(stored.notes[0].content, "Line one\n<script>alert(1)</script>");

    triggerEditorKey(runtime, "notes", itemId, { key: "Enter", ctrlKey: true });
    stored = getStoredProductivityState(runtime);
    assert.equal(stored.notes[0].content, "Updated note");

    clickListAction(runtime, "notes", itemId, "delete");
    stored = getStoredProductivityState(runtime);
    assert.equal(stored.notes.length, 0);
    assert.equal(runtime.emptyStates.notes.classList.contains("hidden"), false);
});

test("blank note submission marks the field invalid and shows an error message", () => {
    const runtime = bootstrapProductivityRuntime();

    runtime.inputs.notes.value = "\n  ";
    submitForm(runtime, "notes");

    assert.equal(runtime.inputs.notes.getAttribute("aria-invalid"), "true");
    assert.equal(runtime.messages.notes.classList.contains("hidden"), false);
    assert.ok(runtime.messages.notes.textContent.includes("Please enter a note"));
});
