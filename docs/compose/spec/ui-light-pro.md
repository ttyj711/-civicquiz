---
feature: ui-light-pro
status: delivered
updated: 2026-09-24
branch: main
commits: c870515..c870515 # working tree; fill after commit
---

# 轻量专业备考视觉体系

## Report

**What was built** — 将 CivicQuiz 小程序视觉从「卡片堆叠」升级为「轻量专业备考」：全局 Token 对齐提案色板（主色 `#3F7D5A`、错误 `#D96C5F`、收藏 `#D99A45` 等）；卡片改为轻边框+极浅阴影、圆角统一 24/32；「我的」页去嵌套卡、头像弱化、学习数据改为 2×2 网格、错题/最近考试扁平行列表；练习/考试答题页统一圆形字母选项键与四态、进度条百分比、底栏 Ghost 收藏 + Primary 下一题。核心 UI 去除 emoji。

**Verification** — `pnpm typecheck` PASS；`pnpm build:h5` PASS（Compiled successfully，仅既有体积警告）。Review 无 critical。

**Journey log**
- Taro designWidth=750 下「设计 16px」≈ scss `32px`，圆角 12/16pt 对应 24/32。
- 双主题保留暖棕识别，theme-b 文字改暖灰并补齐 danger/success。
- 选项组件 chip/plain 收敛为同一圆形键，避免考试页「表单感」。

## [S1] Problem

当前 UI 是「浅灰底 + 大量白卡片 + 绿色按钮 + 圆角」，视觉问题：

1. 模块几乎都做成白卡+边框+阴影，出现「卡片套卡片」，层级过多。
2. 颜色语义不清：绿色使用过宽，错误/收藏/状态缺少专属色。
3. 字阶拉不开，数字与标签同等重要，缺少视觉优先级。
4. 答题选项像表单输入框，不像考试答题卡。
5. 圆角/阴影/间距不统一，整体偏「个人刷题工具」而非专业备考产品。

目标风格关键词：**清晰 / 安静 / 可信 / 高效 / 不焦虑**。

## [S2] Design

### 范围

- **Token 层**：`apps/miniapp/src/app.scss`（含 theme-b）
- **两个重点页**：「我的」`pages/mine/*`、答题（练习 `pages/practice/quiz.*` + 考试 `pages/exams/quiz.*`，含 `QuestionOptions`）
- 其他页面仅随 Token 自动变浅色/换色板，本轮不改 JSX 结构

**Workspace**：用户选择直接在 `main` 修改（覆盖默认 worktree 门禁）。

### 视觉 Token（方案 A 舒缓绿）

| Token | 值 | 用途 |
| --- | --- | --- |
| primary | `#3F7D5A` | 主操作 / 正确 / 当前状态 |
| primary-deep | `#286044` | 主色文字强调 |
| primary-soft | `#EEF6F0` | 选中/主色浅底 |
| bg | `#F6F8F6` | 页面背景 |
| panel | `#FFFFFF` | 主内容卡 |
| panel-soft | `#F0F3F1` | 轻分区底（非独立卡） |
| border | `#E5EAE6` | 边框 |
| text | `#1F2933` | 主文字 |
| text-sub | `#718096` | 次文字 |
| text-faint | `#A0AAA4` | 禁用/弱化 |
| success | `#3F7D5A` | 正确 |
| danger | `#D96C5F` | 错误（柔和） |
| warn | `#D99A45` | 收藏/提醒 |

**theme-b** 保持暖棕识别：primary `#8C6D53` / primary-deep `#6B5340` / primary-soft `#F3EDE4` / bg `#FAF6F0`，文字用暖灰 `#6B6258` / `#A0988C`。

### 几何与层次

| 项 | 规则 |
| --- | --- |
| 层级 | L1 页面 `bg` → L2 主卡 `panel` radius 32 → L3 数据**非卡片**网格 |
| 圆角 | 按钮/选项 24 · 卡片 32 · 禁止混用 8/10/14/20 档 |
| 阴影 | 默认无阴影或 `0 4px 16px rgba(31,41,51,.04)`；优先 border |
| 间距 | 页边距 32 · 卡内 32 · 区块间 40 · 元素间 24 |
| 字阶 | 大数字 48–56/700 · 页标题 40/600 · 模块标题 32/600 · 正文 28–30/400 · 辅助 24/400 |

### 颜色语义

- 绿 = 主要操作 / 正确 / 当前进度
- 灰 = 普通信息
- 柔红 = 错误
- 橙 = 收藏 / 提醒
- 禁止大面积渐变、emoji 导航图标、重阴影

### 「我的」页结构

```
[弱化头像] 昵称 …… 设置
准备好继续学习了吗？
今日进度 ████████░░ 68%
已完成 x / 20 题
[继续学习 →]

学习数据（无嵌套卡）
  答题数 / 正确率 / 错题 / 收藏

错题复习行（主卡）→

最近考试（主卡列表）分数 →
```

视觉优先级：继续学习/今日进度 > 学习数据 > 错题 > 最近考试 > 设置。

### 答题页（练习 + 考试）

| 元素 | 规则 |
| --- | --- |
| 进度 | 「第 i / N 题」+ 题型标签 + 粗进度条 + 百分比 |
| 题干 | 轻白卡，无重阴影，字号加重大行距 |
| 选项 | 左侧圆形字母键；默认白底细边；选中 soft+主色；对/错柔色 + ✓/✕ |
| 反馈 | 练习即时「回答正确/错误」+ 正确答案 + 解析 |
| 底栏 | 左 Ghost「☆ 收藏」右 Primary「下一题 →」；未答禁用 |
| 去 emoji | 核心操作不用 emoji（☆/✓/✕ 符号可保留） |

### 图标与装饰

- 两页内去掉 emoji 装饰；设置用文字「设置」
- 不新增第三方 icon 库

## [S3] Out of Scope

- 不改首页/题库/考试列表/错题/收藏/设置 JSX 结构（仅 Token 连带变色）
- 不引入 icon 组件库、不改 TabBar 选中底（WeChat 原生限制）
- 不改业务逻辑与 API
- 不做深色模式
- HTML 原型 `index.html` 不在本轮同步

## Tasks

- [x] T1: 重定义 app.scss Token/字阶/圆角/阴影/卡片默认 — acceptance: 全局色值与提案一致，卡片 radius 32、阴影极轻 (covers: S2)
- [x] T2: 「我的」页去嵌套卡、重排优先级与数据网格 — acceptance: 无卡片套卡片；头像弱化；学习数据为网格 (covers: S2; depends: T1)
- [x] T3: 练习答题页视觉升级（进度/题干/选项/底栏） — acceptance: 选项四态清晰，底栏主次按钮，无 emoji (covers: S2; depends: T1)
- [x] T4: 考试答题页对齐同一视觉语言 — acceptance: 进度条与选项样式与练习一致 (covers: S2; depends: T3)
- [x] T5: typecheck + build:h5 — acceptance: 编译通过无新增 error (covers: S2; depends: T2, T3, T4)
