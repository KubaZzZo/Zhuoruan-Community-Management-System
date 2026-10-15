# Repository Guidelines

## Project Structure & Module Organization

This repository is the ZhuoRuan Information Studio freshman recruitment site. The Vue 3 app talks to one Node API. Applications are stored in MySQL.

- `index.html`: Vite HTML entry that mounts the Vue app.
- `src/App.vue`: Vue views for the homepage, department pages, recruitment form, status lookup, and minister review.
- `src/main.js`: Vue application bootstrap.
- `src/recruitment.js` and `src/recruitment.cjs`: shared recruitment business logic.
- `src/recruitmentApi.js`: browser client for the recruitment API.
- `server/`: Node API. Vite mounts it during development, and `npm start` serves the built site with the same API.
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
npm test
```

`test_app.js` validates core application logic. `test_pages.js` checks required page fields and management elements. `test_server.js` checks the API with a temporary JSON file, so it does not need MySQL.

## Coding Style & Naming Conventions

Use 2-space indentation in Vue, HTML, CSS, and JavaScript. Prefer descriptive camelCase names in JavaScript, such as `validateApplication` and `preferredDepartment`. Keep reusable business logic in `src/recruitment.js`; keep Vue state, computed values, and templates in `src/App.vue`.

CSS should use class names that describe UI roles, for example `.site-header`, `.form-panel`, and `.admin-toolbar`. Keep colors centralized in `:root` variables.

## Testing Guidelines

Tests use Node's built-in `assert` module, with no external test framework. Add tests under `tests/` using the pattern `test_<area>.js`. When adding form fields or admin controls, update `src/App.vue` and `tests/test_pages.js`. When changing data behavior, update `tests/test_app.js` and `tests/test_server.js`.

Run `npm test` before handing off changes.

## Commit & Pull Request Guidelines

This directory is a Git repository. Preserve existing uncommitted changes and use concise imperative commit messages, for example:

```bash
git commit -m "Add recruitment form validation"
```

Pull requests should include a short summary, screenshots for visible UI changes, testing commands run, and notes about any changes to recruitment fields or storage behavior.

## Security & Configuration Tips

Application records are stored in the MySQL database `zhuoruan_recruitment`. Connection settings live in the root `.env` file: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE`. Do not commit `.env`, real applicant data, or private phone numbers. The browser only keeps an unsent form draft in `localStorage`. Staff sign-in is loaded by `server/accounts.cjs` from ignored local hash configuration; first startup creates random onboarding credentials under `data/`. Never restore hardcoded default passwords. `OPERATIONS.md` describes setup and retention policy. `npm run test:mysql` creates and removes only a randomly named `zhuoruan_test_*` database; never clear or write production records for verification. `tests/test_browser.cjs` uses temporary JSON data and its own browser tab.
