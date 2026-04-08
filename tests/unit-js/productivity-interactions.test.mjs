import assert from "node:assert/strict";
import test from "node:test";

import {
    bootstrapProductivityRuntime,
    clickListAction,
    getNoteItems,
    getTodoItems,
    inputValue,
    submitForm,
    toggleTodo,
    triggerEditorKey
} from "./productivity.test-utils.mjs";

test("todo and notes empty states are visible on a fresh productivity page", async () => {
    const runtime = await bootstrapProductivityRuntime();

    assert.equal(runtime.emptyStates.todo.classList.contains("hidden"), false);
    assert.equal(runtime.emptyStates.notes.classList.contains("hidden"), false);
});

test("adding a valid todo item sends it through the API, renders deadline metadata, and resets the form", async () => {
    const runtime = await bootstrapProductivityRuntime();

    inputValue(runtime, "todo", "title", "Ship release checklist");
    inputValue(runtime, "todo", "description", "Validate demo flow");
    inputValue(runtime, "todo", "priority", "HIGH");
    inputValue(runtime, "todo", "deadline", "2099-04-10T12:30");
    await submitForm(runtime, "todo");

    const todos = getTodoItems(runtime);
    assert.equal(todos.length, 1);
    assert.equal(todos[0].title, "Ship release checklist");
    assert.equal(todos[0].description, "Validate demo flow");
    assert.equal(todos[0].priority, "HIGH");
    assert.equal(todos[0].deadline, "2099-04-10T12:30");
    assert.equal(runtime.emptyStates.todo.classList.contains("hidden"), true);
    assert.equal(runtime.inputs.todo.title.value, "");
    assert.equal(runtime.inputs.todo.description.value, "");
    assert.equal(runtime.inputs.todo.priority.value, "LOW");
    assert.equal(runtime.inputs.todo.deadline.value, "");
    assert.ok(runtime.lists.todo.innerHTML.includes("Ship release checklist"));
    assert.ok(runtime.lists.todo.innerHTML.includes("Due"));
});

test("blank todo submission marks the field invalid and shows an error message", async () => {
    const runtime = await bootstrapProductivityRuntime();

    inputValue(runtime, "todo", "title", "   ");
    await submitForm(runtime, "todo");

    assert.equal(runtime.inputs.todo.title.getAttribute("aria-invalid"), "true");
    assert.equal(runtime.messages.todo.classList.contains("hidden"), false);
    assert.ok(runtime.messages.todo.textContent.includes("Please enter a task"));

    inputValue(runtime, "todo", "title", "Fix docs");
    assert.equal(runtime.inputs.todo.title.getAttribute("aria-invalid"), null);
    assert.equal(runtime.messages.todo.classList.contains("hidden"), true);
});

test("[ui-negative] past deadline is rejected without calling the todo API", async () => {
    const runtime = await bootstrapProductivityRuntime();

    inputValue(runtime, "todo", "title", "Expired task");
    inputValue(runtime, "todo", "deadline", "2000-01-01T10:00");
    await submitForm(runtime, "todo");

    assert.equal(getTodoItems(runtime).length, 0);
    assert.equal(runtime.messages.todo.textContent, "Deadline cannot be in the past.");
    assert.equal(runtime.inputs.todo.deadline.getAttribute("aria-invalid"), "true");

    const todoPostCalls = runtime.serverState.requests.filter(request =>
        request.method === "POST" && request.url === "/api/productivity/todos"
    );
    assert.equal(todoPostCalls.length, 0);
});

test("[ui-negative] malformed deadline text is rejected without calling the todo API", async () => {
    const runtime = await bootstrapProductivityRuntime();

    inputValue(runtime, "todo", "title", "Task with malformed deadline");
    inputValue(runtime, "todo", "deadline", "not-a-date");
    await submitForm(runtime, "todo");

    assert.equal(getTodoItems(runtime).length, 0);
    assert.equal(runtime.messages.todo.textContent, "Please enter a valid deadline.");
    assert.equal(runtime.inputs.todo.deadline.getAttribute("aria-invalid"), "true");

    const todoPostCalls = runtime.serverState.requests.filter(request =>
        request.method === "POST" && request.url === "/api/productivity/todos"
    );
    assert.equal(todoPostCalls.length, 0);
});

test("todo item supports complete, edit, save, cancel, delete, and keyboard save", async () => {
    const runtime = await bootstrapProductivityRuntime({
        todos: [
            {
                todoId: 11,
                title: "Review pull request",
                description: "Regression pass",
                isDone: false,
                priority: "LOW",
                deadline: "2099-04-12T09:30",
                createdAt: "2099-04-08T09:00:00"
            }
        ]
    });

    await toggleTodo(runtime, "11", true);
    let todos = getTodoItems(runtime);
    assert.equal(todos[0].isDone, true);

    await clickListAction(runtime, "todo", "11", "edit");
    const todoEditor = runtime.lists.todo.querySelector('[data-item-id="11"] [data-edit-field="todo"]');
    assert.ok(todoEditor);
    assert.equal(todoEditor.wasFocused, true);

    todoEditor.value = "Review final pull request";
    const descriptionEditor = runtime.lists.todo.querySelector('[data-item-id="11"] [name="description"]');
    descriptionEditor.value = "Expanded verification";
    const priorityEditor = runtime.lists.todo.querySelector('[data-item-id="11"] [name="priority"]');
    priorityEditor.value = "MEDIUM";
    const deadlineEditor = runtime.lists.todo.querySelector('[data-item-id="11"] [name="deadline"]');
    deadlineEditor.value = "2099-04-13T11:00";
    await triggerEditorKey(runtime, "todo", "11", { key: "Enter" });

    todos = getTodoItems(runtime);
    assert.equal(todos[0].title, "Review final pull request");
    assert.equal(todos[0].description, "Expanded verification");
    assert.equal(todos[0].priority, "MEDIUM");
    assert.equal(todos[0].deadline, "2099-04-13T11:00");

    await clickListAction(runtime, "todo", "11", "edit");
    const secondEditor = runtime.lists.todo.querySelector('[data-item-id="11"] [data-edit-field="todo"]');
    secondEditor.value = "Temporary edit";
    await clickListAction(runtime, "todo", "11", "cancel-edit");
    todos = getTodoItems(runtime);
    assert.equal(todos[0].title, "Review final pull request");

    await clickListAction(runtime, "todo", "11", "delete");
    todos = getTodoItems(runtime);
    assert.equal(todos.length, 0);
    assert.equal(runtime.emptyStates.todo.classList.contains("hidden"), false);
});

test("adding and editing notes preserves content, supports keyboard save modifiers, and escapes HTML", async () => {
    const runtime = await bootstrapProductivityRuntime();

    runtime.tabs.notes.dispatchEvent({
        type: "click",
        target: runtime.tabs.notes
    });
    inputValue(runtime, "notes", null, "Line one\n<script>alert(1)</script>");
    await submitForm(runtime, "notes");

    let notes = getNoteItems(runtime);
    assert.equal(notes.length, 1);
    assert.equal(runtime.emptyStates.notes.classList.contains("hidden"), true);
    assert.ok(runtime.lists.notes.innerHTML.includes("Line one<br>&lt;script&gt;alert(1)&lt;/script&gt;"));

    await clickListAction(runtime, "notes", "1", "edit");
    const noteEditor = runtime.lists.notes.querySelector('[data-item-id="1"] [data-edit-field="notes"]');
    assert.ok(noteEditor);

    noteEditor.value = "Updated note";
    await triggerEditorKey(runtime, "notes", "1", { key: "Enter" });
    notes = getNoteItems(runtime);
    assert.equal(notes[0].noteText, "Line one\n<script>alert(1)</script>");

    await triggerEditorKey(runtime, "notes", "1", { key: "Enter", ctrlKey: true });
    notes = getNoteItems(runtime);
    assert.equal(notes[0].noteText, "Updated note");

    await clickListAction(runtime, "notes", "1", "delete");
    notes = getNoteItems(runtime);
    assert.equal(notes.length, 0);
    assert.equal(runtime.emptyStates.notes.classList.contains("hidden"), false);
});

test("blank note submission marks the field invalid and shows an error message", async () => {
    const runtime = await bootstrapProductivityRuntime();

    inputValue(runtime, "notes", null, "\n  ");
    await submitForm(runtime, "notes");

    assert.equal(runtime.inputs.notes.getAttribute("aria-invalid"), "true");
    assert.equal(runtime.messages.notes.classList.contains("hidden"), false);
    assert.ok(runtime.messages.notes.textContent.includes("Please enter a note"));
});

test("[ui-negative] forbidden 67-style todo and note content is rejected without changing server state", async () => {
    const runtime = await bootstrapProductivityRuntime();

    inputValue(runtime, "todo", "title", "67");
    await submitForm(runtime, "todo");
    assert.equal(getTodoItems(runtime).length, 0);
    assert.equal(runtime.messages.todo.textContent, "67 and six seven are not allowed here.");
    assert.equal(runtime.inputs.todo.title.getAttribute("aria-invalid"), "true");

    runtime.tabs.notes.dispatchEvent({
        type: "click",
        target: runtime.tabs.notes
    });
    inputValue(runtime, "notes", null, "Six seven");
    await submitForm(runtime, "notes");
    assert.equal(getNoteItems(runtime).length, 0);
    assert.equal(runtime.messages.notes.textContent, "67 and six seven are not allowed here.");
    assert.equal(runtime.inputs.notes.getAttribute("aria-invalid"), "true");
});

test("[ui-negative] invalid edit-save keeps the previous productivity item unchanged and shows feedback", async () => {
    const runtime = await bootstrapProductivityRuntime({
        todos: [
            {
                todoId: 21,
                title: "Ship docs",
                description: "",
                isDone: false,
                priority: "LOW",
                deadline: null,
                createdAt: "2099-04-08T09:00:00"
            }
        ],
        notes: [
            {
                noteId: 31,
                noteText: "Original note"
            }
        ]
    });

    await clickListAction(runtime, "todo", "21", "edit");
    const todoEditor = runtime.lists.todo.querySelector('[data-item-id="21"] [data-edit-field="todo"]');
    todoEditor.value = "   ";
    await clickListAction(runtime, "todo", "21", "save-edit");
    let todos = getTodoItems(runtime);
    assert.equal(todos[0].title, "Ship docs");
    assert.equal(runtime.messages.todo.textContent, "Please enter a task before adding it.");

    todoEditor.value = "six seven";
    await clickListAction(runtime, "todo", "21", "save-edit");
    todos = getTodoItems(runtime);
    assert.equal(todos[0].title, "Ship docs");
    assert.equal(runtime.messages.todo.textContent, "67 and six seven are not allowed here.");

    const deadlineEditor = runtime.lists.todo.querySelector('[data-item-id="21"] [name="deadline"]');
    todoEditor.value = "Valid title";
    deadlineEditor.value = "2000-01-01T10:00";
    await clickListAction(runtime, "todo", "21", "save-edit");
    todos = getTodoItems(runtime);
    assert.equal(todos[0].deadline, null);
    assert.equal(runtime.messages.todo.textContent, "Deadline cannot be in the past.");

    deadlineEditor.value = "not-a-date";
    await clickListAction(runtime, "todo", "21", "save-edit");
    todos = getTodoItems(runtime);
    assert.equal(todos[0].deadline, null);
    assert.equal(runtime.messages.todo.textContent, "Please enter a valid deadline.");

    await clickListAction(runtime, "notes", "31", "edit");
    const noteEditor = runtime.lists.notes.querySelector('[data-item-id="31"] [data-edit-field="notes"]');
    noteEditor.value = "   ";
    await clickListAction(runtime, "notes", "31", "save-edit");
    let notes = getNoteItems(runtime);
    assert.equal(notes[0].noteText, "Original note");
    assert.equal(runtime.messages.notes.textContent, "Please enter a note before saving it.");

    noteEditor.value = "six seven";
    await clickListAction(runtime, "notes", "31", "save-edit");
    notes = getNoteItems(runtime);
    assert.equal(notes[0].noteText, "Original note");
    assert.equal(runtime.messages.notes.textContent, "67 and six seven are not allowed here.");
});

test("[ui-negative] backend deadline validation error is surfaced for create and edit flows", async () => {
    const runtime = await bootstrapProductivityRuntime({
        todos: [
            {
                todoId: 51,
                title: "Existing task",
                description: "",
                isDone: false,
                priority: "LOW",
                deadline: null,
                createdAt: "2099-04-08T09:00:00"
            }
        ],
        failures: {
            "POST /api/productivity/todos": {
                status: 400,
                body: {
                    message: "Deadline cannot be in the past"
                }
            },
            "PATCH /api/productivity/todos/51": {
                status: 400,
                body: {
                    message: "Deadline cannot be in the past"
                }
            }
        }
    });

    inputValue(runtime, "todo", "title", "Create should fail");
    inputValue(runtime, "todo", "deadline", "2099-04-10T12:30");
    await submitForm(runtime, "todo");
    assert.equal(runtime.messages.todo.textContent, "Deadline cannot be in the past");
    assert.equal(getTodoItems(runtime).length, 1);

    await clickListAction(runtime, "todo", "51", "edit");
    const todoEditor = runtime.lists.todo.querySelector('[data-item-id="51"] [data-edit-field="todo"]');
    const deadlineEditor = runtime.lists.todo.querySelector('[data-item-id="51"] [name="deadline"]');
    todoEditor.value = "Updated task";
    deadlineEditor.value = "2099-04-11T09:00";
    await clickListAction(runtime, "todo", "51", "save-edit");

    const todos = getTodoItems(runtime);
    assert.equal(todos[0].title, "Existing task");
    assert.equal(runtime.messages.todo.textContent, "Deadline cannot be in the past");
});
