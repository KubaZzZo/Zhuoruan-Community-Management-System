# Cyber Recruitment Frontend Design

## Goal

按照 `设计文档.md` 完善现有 Vue3 招新原型，把宣传页升级为暗黑终端/赛博风多区块体验，同时保留报名表、管理员后台和 localStorage 演示数据流。

## Scope

本阶段实现前端完整升级，不接真实后端，不引入重型 3D、GSAP 或 Tailwind 依赖。新增 `matrix` 和 `arsenal` 两个 Vue 视图，继续使用 hash 路由。

## Architecture

- `src/App.vue` 继续作为单文件 Vue 原型承载页面状态、视图切换和表单交互。
- `src/recruitment.js` 与 `src/recruitment.cjs` 保持业务逻辑边界，报名校验、记录生成、筛选和状态修改不移动。
- `styles.css` 负责本阶段视觉升级，采用暗黑背景、终端日志、霓虹按钮、监控卡片和伪终端报名壳层。
- `tests/test_pages.js` 增加页面结构测试，确保新路由、矩阵内容和终端报名体验不被回归删除。
- `阶段总结.md` 追加阶段记录，说明完成范围和仍未完成的后端/真实 3D 能力。

## UX Decisions

首页使用 `The Awakening` 概念，首屏左侧呈现启动日志和口号，右侧使用 CSS 构造服务器机柜动效，避免新增 3D 依赖导致项目复杂化。

`matrix` 页面使用 Bento 风格卡片呈现 API、导师和项目训练场；`arsenal` 页面用技能树与方向卡片表达后端、前端、AI/Ops 三条主线。

报名页保留完整表单字段，但外层改成 `Root Access` 终端风，让用户仍能稳定填写真实报名信息。管理员后台维持现有前端口令和本地数据管理能力。

## Testing

运行：

```bash
npm test
npm run build
```

验收标准：

- 页面测试能发现 `matrix`、`arsenal`、`api.zhuoruan.xyz` 和终端报名标记。
- 原报名字段、后台筛选、详情、状态更新测试继续通过。
- Vite 生产构建通过。
