import assert from "node:assert/strict";
import test from "node:test";

import { createLocalStorage } from "./timer-state.test-utils.mjs";
import {
    bootstrapProductivityRuntime,
    dispatchStorageSync,
    getStoredProductivityState,
    submitForm
} from "./productivity.test-utils.mjs";

test("productivity page normalizes valid stored data and ignores malformed entries", () => {
    const localStorage = createLocalStorage({
        "telos.productivity.v1": JSON.stringify({
            todo: [
                {
                    id: "todo-1",
                    text: "Persisted task",
                    completed: true,
                    createdAt: "2026-04-08T10:00:00.000Z",
                    updatedAt: "2026-04-08T10:05:00.000Z"
                },
                {
                    id: 42,
                    text: "bad item"
                }
            ],
            notes: [
                {
                    id: "note-1",
                    content: "Persisted note",
                    createdAt: "bad-date",
                    updatedAt: "2026-04-08T10:07:00.000Z"
                },
                {
                    content: "missing id"
                }
            ]
        })
    });

    const runtime = bootstrapProductivityRuntime({ localStorage });

    assert.ok(runtime.lists.todo.innerHTML.includes("Persisted task"));
    assert.ok(!runtime.lists.todo.innerHTML.includes("bad item"));
    assert.ok(runtime.lists.notes.innerHTML.includes("Persisted note"));
    assert.equal(runtime.emptyStates.todo.classList.contains("hidden"), true);
    assert.equal(runtime.emptyStates.notes.classList.contains("hidden"), true);
});

test("corrupted productivity storage falls back to a safe empty state", () => {
    const localStorage = createLocalStorage({
        "telos.productivity.v1": "{broken-json"
    });

    const runtime = bootstrapProductivityRuntime({ localStorage });

    assert.equal(runtime.emptyStates.todo.classList.contains("hidden"), false);
    assert.equal(runtime.emptyStates.notes.classList.contains("hidden"), false);
    assert.equal(runtime.lists.todo.innerHTML, "");
    assert.equal(runtime.lists.notes.innerHTML, "");
});

test("storage event sync updates another productivity page instance without reload", () => {
    const sharedStorage = createLocalStorage();
    const firstRuntime = bootstrapProductivityRuntime({ localStorage: sharedStorage });
    const secondRuntime = bootstrapProductivityRuntime({ localStorage: sharedStorage });

    firstRuntime.inputs.todo.value = "Cross-tab task";
    submitForm(firstRuntime, "todo");

    dispatchStorageSync(secondRuntime);

    const stored = getStoredProductivityState(secondRuntime);
    assert.equal(stored.todo.length, 1);
    assert.equal(stored.todo[0].text, "Cross-tab task");
    assert.ok(secondRuntime.lists.todo.innerHTML.includes("Cross-tab task"));
    assert.equal(secondRuntime.emptyStates.todo.classList.contains("hidden"), true);
});
