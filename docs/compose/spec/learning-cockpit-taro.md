---
feature: learning-cockpit-taro
status: delivered
updated: 2026-09-24
branch: main
commits: uncommitted working tree (apps/miniapp learning-cockpit IA)
---

# 学习闭环信息架构 · Taro 小程序落地

## Report

**What was built** — 将 HTML 原型验证过的学习闭环信息架构落到 `apps/miniapp`：首页升级为学习驾驶舱（今日任务进度 / 继续学习 / 今日建议）；「我的」改为备考驾驶舱（分层指标、错题行动卡、历史考试卡片含正确率/题数/用时）；新增设置页承接外观主题；练习页进度百分比与未答门控；考试页进度条、题干收藏、结果页「查看错题 / 再做一次 / 返回首页」。续考会恢复已存作答；错题/收藏练习使用正确 bankId。

**Verification** — `pnpm typecheck` PASS；`pnpm build:h5` PASS（Compiled successfully，仅既有 vendors 体积警告）。Review 关键项复审全部 FIXED，无新增 critical。

**Journey log**
- 服务端 `startExam` 不回已存答案 → 用 `fetchUserExamDetail` 在进考场后恢复。
- WRONG/FAVORITE 按 `bank_id` 过滤，必须用错题/收藏自身的 bankId，不能用题库列表第一个。
- `user_exam.duration` 单位是秒，展示需换算成分钟。
- `exams/review` 需识别 `onlyWrong` 才能支撑「查看错题」。

## [S1] Problem

HTML 原型已验证「学习目标 → 刷题 → 即时反馈 → 错题复习 → 模拟考试 → 学习数据」链路，但小程序真代码仍是题库工具形态：

1. 首页只有题库入口与两个按钮，缺少今日任务进度、「继续学习」与「今日建议」。
2. 「我的」指标平铺，未区分核心/辅助；错题只是数字，缺行动入口；外观占主区。
3. 历史考试仅有分数，缺正确率/题数/用时与「查看详情」闭环。
4. 考试结果缺「查看错题 / 再做一次 / 返回首页」；缺设置页承接外观。
5. 练习可跳过未答题进下一题；进度缺百分比。

## [S2] Design

### 范围

仅改 `apps/miniapp`；不动 server/admin/API 契约（在现有 `UserStats` / `UserExamItem` 等类型上组织 UI）。

**Workspace**：用户明确选择在 `main` 上直接修改（覆盖默认 worktree 门禁）。

### 首页（学习驾驶舱）

| 区块 | 行为 |
| --- | --- |
| Hero | 问候 + 昵称 + 今日答题/正确率/累计（保留） |
| 今日任务 | 今日完成 x/20 进度条、正确率、待巩固错题数 |
| 继续学习 | 有进行中考试→「继续考试」；否则「随机练习 20 题」 |
| 今日建议 | 错题复习 N / 收藏练习 N / 继续刷题，可点击 |
| 开始学习 | 保留最多 4 题库快捷入口 |

### 「我的」备考驾驶舱

| 区块 | 行为 |
| --- | --- |
| 头部 | 昵称、今日已完成 x/20、进度条、设置入口 |
| 核心指标 | 累计答题、正确率、错题（三列大数字） |
| 辅助指标 | 收藏、模拟考试次数（两列） |
| 错题复习卡 | 「还有 N 道待巩固」+「去复习」→ wrong 页 |
| 继续学习 | 进行中考试「继续考试」；否则随机练习入口 |
| 历史考试 | 得分、正确率、题数、用时、时间；点击→ review |
| 外观 | **迁出**至 `/pages/mine/settings` |

### 设置页（新）

- 路径：`/pages/mine/settings`
- 外观：舒缓绿 / 暖棕，切换即全局生效并持久化
- 只读：昵称、学习数据摘要

### 练习答题页增强

| 项 | 规则 |
| --- | --- |
| 顶栏 | 第 i/N 题 + 题型 + **百分比** |
| 未答门控 | 未判分前「下一题」不可用（多选需先提交本题） |
| 即时反馈 | 保留现有对错/答案对比/解析/考点 |

### 考试答题页增强

| 项 | 规则 |
| --- | --- |
| 顶栏 | 倒计时 + 进度条百分比 + 已答/总题 |
| 题卡收藏 | 题干区 ☆ 收藏/取消 |
| 续考 | 恢复服务端已存作答 |
| 上一题/下一题 | 保留；最后一题交卷；答题卡保留 |

### 考试结果

- 保留大分数与对/错/未答
- 操作：**查看错题**（review `onlyWrong=1`）、**再做一次**（detail）、**返回首页**（switchTab）
- 自动交卷 Tag 保留

### 导航

- `app.config.ts` 注册 `pages/mine/settings`
- 我的头部「设置」→ settings

## [S3] Out of Scope

- 不改 server/admin、不加新 API（今日目标固定 20 展示）
- 不做连续学习天数、笔记持久化 API
- 不改 banks/exams 列表页视觉
- 不做填空/主观题
- 「继续学习」默认入口为随机练习直达；完整刷题设置 select 流仍从题库进入

## Tasks

- [x] T1: 首页学习驾驶舱（今日任务/继续学习/今日建议） — acceptance: 四区块可点进对应练习或考试 (covers: S2)
- [x] T2: 新增设置页并迁移外观；注册路由 — acceptance: 我的→设置→切换主题全局生效，主页无外观块 (covers: S2; depends: T1)
- [x] T3: 「我的」驾驶舱（分层指标/错题行动/历史卡片/继续学习） — acceptance: 错题可去复习，历史展示正确率题数用时 (covers: S2; depends: T2)
- [x] T4: 练习页进度百分比 + 未答门控下一题 — acceptance: 未判分不能进下一题；顶栏有百分比 (covers: S2)
- [x] T5: 考试页进度条/收藏 + 结果页三操作 — acceptance: 题干可收藏；结果可查看错题/再做/回首页 (covers: S2; depends: T4)
- [x] T6: typecheck + H5 构建/页面冒烟 — acceptance: `pnpm typecheck` 通过，关键页无报错 (covers: S2; depends: T1, T2, T3, T4, T5)
