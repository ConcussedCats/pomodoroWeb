import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const template = readFileSync("src/main/resources/templates/about.html", "utf8");

test("about page contains product overview, usage guidance, benefits, and team roster", () => {
    [
        "Telos turns Pomodoro into a complete focus system.",
        "Why Telos is useful",
        "How to use it",
        "Why it helps",
        "The team behind Telos"
    ].forEach(copy => assert.ok(template.includes(copy), `Missing About page copy: ${copy}`));

    [
        "The Pomodoro technique works because it replaces vague effort with a visible rhythm",
        "A better choice for everyday focus",
        "Automatic phase transitions help users maintain momentum",
        "Saved settings make the app personal"
    ].forEach(copy => assert.ok(template.includes(copy), `Missing Pomodoro/product benefit copy: ${copy}`));

    [
        "Configure the timer",
        "Start, pause, reset, or skip phases",
        "Track the current cycle",
        "Use Productivity during planning",
        "Sign in for persistence"
    ].forEach(step => assert.ok(template.includes(step), `Missing About page instruction: ${step}`));

    [
        ["Oleh Blazhko", "QA", "regression coverage"],
        ["Vlad Hlovatskyy", "PM", "product goal"],
        ["Artem Uiechko", "Fullstack", "frontend experience with backend behavior"],
        ["Yurii Pikh", "DevOps", "environment stability"],
        ["Vlad Dudych", "UI/UX", "visual and interaction design"]
    ].forEach(([name, role, detail]) => {
        assert.ok(template.includes(name), `Missing team member: ${name}`);
        assert.ok(template.includes(role), `Missing team role: ${role}`);
        assert.ok(template.includes(detail), `Missing team detail: ${detail}`);
    });
});
