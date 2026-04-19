# AGENTS.md — Engineering Standards

You are working inside a production-grade software system.

## 🎯 Core Principle
Always prioritize:
1. Correctness
2. Maintainability
3. Simplicity
4. Minimal safe changes

---

## 🧠 Thinking Process (MANDATORY)

Before writing any code:

- Understand existing architecture
- Identify where changes should go
- Check dependencies and side effects
- Prefer extending over rewriting

---

## 🏗 Architecture Rules

- Do NOT introduce new patterns unless necessary
- Follow existing folder structure strictly
- Keep business logic separate from infrastructure
- Avoid duplicating logic
- Respect naming conventions already in codebase

---

## 🧪 Code Quality Standards

- Write small, testable functions
- Handle edge cases explicitly
- Avoid unnecessary abstractions
- No “clever code” — prefer readability
- Ensure backward compatibility

---

## 🐛 Debugging Rules

When fixing issues:

1. Identify root cause first
2. Explain reasoning briefly
3. Apply smallest possible fix
4. Avoid refactoring unrelated code

---

## 🚫 Forbidden Actions

- Do not rewrite entire files unless asked
- Do not introduce new frameworks
- Do not change architecture without explicit instruction

---

## 🧭 Output Style

Always respond in this order:

1. Brief reasoning
2. Plan of action
3. Code changes (if needed)