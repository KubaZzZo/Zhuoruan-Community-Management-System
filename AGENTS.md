# Repository Guidelines

## Project Structure & Module Organization

This repository contains a Vue 3 front-end prototype for ZhuoRuan Information Studio.

- `index.html`: Vite HTML entry that mounts the Vue app.
- `src/App.vue`: Vue views for homepage, recruitment form, and admin management.
- `src/main.js`: Vue application bootstrap.
- `src/recruitment.js` and `src/recruitment.cjs`: shared recruitment business logic.
- `register.html`: legacy redirect to `index.html#register`.
- `admin.html`: legacy redirect to `index.html#admin`.
- `styles.css`: shared visual styling imported by the Vue app.
- `tests/`: Node-based smoke and logic tests.
- Phase summary Markdown file: project plan and phase summaries.
- Recruitment form DOCX: source form reference for registration fields.

Keep new source files at the repository root unless the project grows enough to justify folders such as `assets/`, `scripts/`, or `docs/`.

## Build, Test, and Development Commands

Install dependencies once:

```bash
npm install
```

Run the Vue development server:

```bash
npm run dev
```

Build production assets:

```bash
npm run build
```

Use these commands from the repository root:

```bash
node tests/test_app.js
node tests/test_pages.js
npm test
```

`test_app.js` validates core application logic. `test_pages.js` checks required page fields and management elements.

## Coding Style & Naming Conventions

Use 2-space indentation in Vue, HTML, CSS, and JavaScript. Prefer descriptive camelCase names in JavaScript, such as `validateApplication` and `preferredDepartment`. Keep reusable business logic in `src/recruitment.js`; keep Vue state, computed values, and templates in `src/App.vue`.

CSS should use class names that describe UI roles, for example `.site-header`, `.form-panel`, and `.admin-toolbar`. Keep colors centralized in `:root` variables.

## Testing Guidelines

Tests use Node's built-in `assert` module, with no external test framework. Add tests under `tests/` using the pattern `test_<area>.js`. When adding form fields or admin controls, update `src/App.vue` and `tests/test_pages.js`. When changing data behavior, update `tests/test_app.js`.

Run both test files before handing off changes.

## Commit & Pull Request Guidelines

This directory is not currently a Git repository, so no existing commit history is available. If Git is initialized, use concise imperative commit messages, for example:

```bash
git commit -m "Add recruitment form validation"
```

Pull requests should include a short summary, screenshots for visible UI changes, testing commands run, and notes about any changes to recruitment fields or storage behavior.

## Security & Configuration Tips

Application data is stored in browser `localStorage`; it is suitable for demos, not sensitive production data. Spring Boot and MySQL are planned but not implemented. Do not commit real applicant data, private phone numbers, or exported browser storage.
