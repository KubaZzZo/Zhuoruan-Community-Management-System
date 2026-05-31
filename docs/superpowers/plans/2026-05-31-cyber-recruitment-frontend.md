# Cyber Recruitment Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing Vue3 recruitment prototype into the cyber terminal themed multi-view experience described in `设计文档.md`.

**Architecture:** Keep the app as a Vite + Vue3 hash-routed prototype. Preserve recruitment business logic in `src/recruitment.js` and only change presentation, view routing, tests, and documentation.

**Tech Stack:** Vue 3 Composition API, Vite, plain CSS, Node assert tests.

---

### Task 1: Page Structure Tests

**Files:**
- Modify: `tests/test_pages.js`

- [x] **Step 1: Write failing tests**

Add tests requiring `matrix`, `arsenal`, `api.zhuoruan.xyz`, `terminal-register`, `join_zhuoruan.sh`, `Root Access`, and `Welcome to Zhuoruan`.

- [x] **Step 2: Run test to verify failure**

Run: `node tests/test_pages.js`

Expected: FAIL because the new routes and terminal shell do not exist yet.

### Task 2: Vue Views

**Files:**
- Modify: `src/App.vue`

- [x] **Step 1: Add view data and routes**

Extend `views` with `matrix` and `arsenal`, add content arrays for boot logs, matrix cards, arsenal tracks, and achievements.

- [x] **Step 2: Add navigation and page sections**

Add public nav links for `算力矩阵` and `技术兵器谱`. Add `v-else-if` views for the two pages.

- [x] **Step 3: Wrap registration in terminal shell**

Change the registration page title to `Root Access`, include `./join_zhuoruan.sh`, and preserve the existing form fields.

### Task 3: Visual Styling

**Files:**
- Modify: `styles.css`
- Modify: `src/main.js`

- [x] **Step 1: Add cyber visual system**

Add dark backgrounds, terminal feed styles, server cabinet CSS illustration, matrix cards, arsenal skill tree, and terminal form styling.

- [x] **Step 2: Add console easter egg**

Print a ZhuoRuan console message from `src/main.js` for users who open developer tools.

### Task 4: Documentation and Verification

**Files:**
- Modify: `阶段总结.md`

- [x] **Step 1: Append stage summary**

Record what was completed, what remains local-only, and which commands passed.

- [x] **Step 2: Run verification**

Run `npm test` and `npm run build`. Fix any failures before handoff.
