# 卓软信息工作室招新

面向江苏师范大学科文学院卓软信息工作室的新生报名站。学生了解部门、提交报名，并用学号加报名手机号查看进度。工作人员按社长或部长权限审核、更正、调剂和导出。

部门介绍按社团介绍文档设置为实干青年部、综合运营部、数据算法部、工程项目部。综合运营、数据算法、工程项目三个部门可直接报名，实干青年部仍由社长内部调剂。历史报名与旧账号保留原部门，兼容规则见 [OPERATIONS.md](OPERATIONS.md)。

当前实现是 Vue 3 页面加 `server/` 里的 Node 接口，报名记录保存在 MySQL 数据库 `zhuoruan_recruitment`。公开首页展示工作室介绍、招新系统真实案例、标明为练习方向的项目建议、成长路径、部门入口和招新流程。算力矩阵和技术兵器谱不在当前范围内。

`src/StudioHome.vue` 是公开首页，`src/studio.css` 的样式限定在首页与部门入门指南；`src/studioContent.js` 存放面向新生的学习建议，不参与招新资格或审核规则。作品图为无个人信息的报名页截图，不使用其他团队的作品、照片或成绩。构图与信息结构参考冰岩作坊和华盛顿大学 Husky Coding Project，保留卓软自己的品牌与文案。

首页使用 `src/useHeroParallax.js` 实现鼠标驱动的分层视差；触摸设备、小屏幕和开启减少动画时保持静态。公开页面更新与验证范围见 [页面更新说明](UI_REFRESH_2026-10-21.md)。

## 常用命令

```bash
npm install
npm run db:migrate
npm run dev
npm test
npm run build
npm start
```

开发地址是 `http://localhost:5173`。`npm test` 不需要 MySQL。数据库、账号、招新时间和资料保留政策见 [OPERATIONS.md](OPERATIONS.md)。

首次运行或升级时先备份数据库，再用有迁移权限的账号运行 `npm run db:migrate`。日常开发与生产服务只检查结构，不再自动修改数据库。修改 `src/recruitment.js` 后运行 `npm run sync:logic`；Node 入口由脚本生成，测试和构建会检查是否同步。

工作人员直接打开 `/#admin`。公开导航不放置人员管理入口。

Docker 部署使用仓库中的 `Dockerfile` 和 `compose.yaml`，包含独立 MySQL、显式迁移和持久化工作人员账号。部署、备份与升级步骤见 [OPERATIONS.md](OPERATIONS.md#docker-部署)。

新生流程为：了解部门 → 填写报名 → 核对资料并确认提交 → 保存报名回执 → 查询审核与面试进度。报名回执可下载为文本；含手机号的回执应由本人妥善保存。页面包含填写示例、选填说明、草稿恢复提示、查询帮助和断网反馈，暂不展示咨询群或联系方式。

运行 `npm run build` 后，可用 `npm run test:browser` 在隔离的 JSON 数据和独立无头 Chrome 上验证完整流程；需要 Python Playwright 和本机 Chrome。新生体验的改动与验证见 [FRESHMAN_EXPERIENCE_2026-10-03.md](FRESHMAN_EXPERIENCE_2026-10-03.md)。
