import assert from "node:assert/strict";
import test from "node:test";

import { bootstrapProductivityRuntime } from "./productivity.test-utils.mjs";

test("productivity page hydrates todo and notes lists from the API on initial load", async () => {
    const runtime = await bootstrapProductivityRuntime({
        todos: [
            {
                todoId: 1,
                title: "Persisted task",
                description: "Loaded from API",
                isDone: true,
                priority: "HIGH",
                deadline: "2099-04-10T12:00",
                createdAt: "2099-04-08T10:00:00"
            }
        ],
        notes: [
            {
                noteId: 1,
                noteText: "Persisted note"
            }
        ]
    });

    assert.ok(runtime.lists.todo.innerHTML.includes("Persisted task"));
    assert.ok(runtime.lists.todo.innerHTML.includes("high"));
    assert.ok(runtime.lists.notes.innerHTML.includes("Persisted note"));
    assert.equal(runtime.emptyStates.todo.classList.contains("hidden"), true);
    assert.equal(runtime.emptyStates.notes.classList.contains("hidden"), true);
});

test("todo load failure keeps a safe empty state and shows a user-visible error", async () => {
    const runtime = await bootstrapProductivityRuntime({
        failures: {
            "GET /api/productivity/todos": {
                status: 500,
                body: {
                    message: "Failed to load tasks"
                }
            }
        }
    });

    assert.equal(runtime.lists.todo.innerHTML, "");
    assert.equal(runtime.emptyStates.todo.classList.contains("hidden"), false);
    assert.equal(runtime.messages.todo.textContent, "Failed to load tasks");
});

test("note load failure keeps a safe empty state and shows a user-visible error", async () => {
    const runtime = await bootstrapProductivityRuntime({
        failures: {
            "GET /api/productivity/notes": {
                status: 500,
                body: {
                    message: "Failed to load notes"
                }
            }
        }
    });

    assert.equal(runtime.lists.notes.innerHTML, "");
    assert.equal(runtime.emptyStates.notes.classList.contains("hidden"), false);
    assert.equal(runtime.messages.notes.textContent, "Failed to load notes");
});
