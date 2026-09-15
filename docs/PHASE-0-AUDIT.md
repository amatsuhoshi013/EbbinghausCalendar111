# EbbinghausCalendar — Phase 0 审计报告

> 审计日期：2026-09-15
> 审计范围：当前仓库全部源码（index.html / app.js / styles.css / Ebbinghaus_backup.json）
> 结论：原型功能完整、可运行；数据模型为"计划中心"，与最终目标（事项中心 + React + Tauri + SQLite）差距主要在架构层面，不在功能层面。建议按本报告 Phase 1 方案先行重构数据模型与工程底座，UI 暂不动。

---

## 一、项目快照

| 项 | 现状 |
|---|---|
| 技术栈 | 原生 HTML + CSS + JavaScript，无构建工具、无包管理、无测试 |
| 文件 | index.html (13 行) · app.js (568 行) · styles.css (297 行) · Ebbinghaus_backup.json（真实用户数据） |
| Git | 单分支 main，唯一提交 `ee1a520 Initial commit`，工作区干净 |
| 存储 | IndexedDB（`ebbinghaus-scheduler` / store `appState`），失败时回退 localStorage（`ebbinghaus-fallback`） |
| 备份 | File System Access API（`showSaveFilePicker`）自动写 JSON；仅 Chrome/Edge 支持 |
| 运行验证 | `node --check app.js` 通过；浏览器直接打开 index.html 即可运行 |

## 二、当前数据结构（v1）

```js
{
  version: 1,
  settings: { defaultIntervals: [1,2,4,7,15], compactMode: true, reviewMinutes: 5 },
  plans: [ { id, title, startDate, intervals: number[], note, createdAt } ],
  completions: { [planId]: { [dateISO]: true } },   // 完成记录挂在 计划+日期 上
  backup: { updatedAt, json },
  selectedDate: "YYYY-MM-DD",
  currentView: "today" | "month"
}
```

真实备份数据：3 个计划（药理拟胆碱药 / 0830单词复习 / 0909单词新学），均从 2026-09-09 开始，间隔 [1,2,4,7,15]，各完成 1 次（2026-09-13）。

## 三、已实现功能（逐项核实）

全部属实：月历（日→六、跨月补齐）、月份前后切换、`<input type=month>` 月份跳转、"今天/本月" tab、点击日期选中、今日待办列表、新建艾宾浩斯计划（名称/开始日期/间隔/备注）、完成标记、删除计划、逾期/今日/未来状态、IndexedDB 保存 + localStorage 回退、JSON 导出、JSON 导入、自动 JSON 备份、基础响应式（1080px 断点单列）。

## 四、缺陷清单（按严重度）

### A. 功能与产品层

1. **点击日期看不到当天安排**（高）。界面文案写着"点击日期查看当天安排"，但渲染层没有任何面板展示选中日期的事项——选中日期只出现在页脚（app.js:332），"复习概览"固定只渲染当月前 14 天（app.js:325）。文案与实现不符，Phase 3 必须做成真正的"选中日期事项面板"。
2. **只能标记完成，不能取消完成**（高）。complete-btn 单向置 `true`（app.js:240-243, 372-378），点错无法撤销。
3. **计划不可编辑、不可移动、不可复制**（高）。只有"新建 + 删除"，且删除无确认。修改日期 → 同步调整复习计划这一核心需求当前完全没有入口。
4. **只有"计划"，没有"普通事项"**（高，产品缺口）。无法创建单日事件；openAddModal 仅支持艾宾浩斯计划（app.js:469-516）。
5. **导入前不备份当前数据**（高）。importJSON 直接覆盖 state（app.js:528-548）；Phase 13 要求"导入前自动备份"，应在第一个可导入版本就做。
6. **导入校验弱**（中）。只校验 `plans` 是数组（app.js:534）；不校验 `plans[i].intervals` 为正整数数组、`startDate` 为合法日期，损坏 JSON 会渲染崩溃。
7. **"今天 / 本月"两个 tab 行为趋同，currentView 不参与渲染**（低）。"今天"=选中日期设今天，"本月"=只改 currentView；渲染始终跟随 selectedDate 的月份（app.js:341-349）。
8. 无搜索、无快捷键、无统计页、无设置页、无分类、无主题/壁纸——均为计划内待建功能，不算缺陷。

### B. 数据与算法层

9. **intervals 语义未文档化**（高）。现行为"距起始日的绝对偏移"：`addDays(startDate, gap)`，[1,2,4,7,15] → D+1/D+2/D+4/D+7/D+15（app.js:191-202）。这与经典艾宾浩斯时间点一致，但 UI 叫"复习间隔"，容易被理解成相邻间隔的累积（1,3,7,14,29）。语义必须 Phase 1 定死并写测试，之后不可再变。
10. **完成记录挂在 `(planId, date)` 上**（高）。日期一旦支持编辑（Phase 4+），完成记录会随日期漂移或失效；新模型应挂在 Event 上。
11. **时间轴把"逾期"画成"完成"**（中）。renderTaskCard 里 `item.date < todayISO() ? "done"`（app.js:406）——任何未完成但已过期的节点显示为绿色"完成"，与 pill 里的"逾期"互相矛盾。
12. **统计口径混用**（中）。`stats.total = plans.length` 是计划数；`dueToday/overdue` 是发生次数；`doneToday`、`overdue` 计算了但页面从未展示（app.js:260-267）。Phase 8 前必须统一口径：事项数=Event 数，计划数=ReviewPlan 数。
13. **预计时长写死 5 分钟**（低）。`stats.total * 5`（app.js:323）从未读取 `settings.reviewMinutes`。
14. 死代码：renderTaskCard 中 `const intervals = [0, ...plan.intervals]` 未使用（app.js:390）。

### C. 健壮性与架构层

15. **全量 innerHTML 重绘 + 手工重绑事件**（中）。render() 每次重建全部 DOM 并在尾部逐一 onclick（app.js:250-387）；`data-plan-id` 等属性未转义（escapeHtml 只覆盖 title/note，app.js:461-467），导入的 id 可注入属性。
16. **localStorage 回退路径缺少二次保护**（低）。loadState 的 catch 内 `JSON.parse(raw)` 失败会直接抛错（app.js:167-169）。
17. Modal 无 Esc 关闭、无焦点圈闭、无 aria 角色（app.js:469-516）。
18. **CSS 变量已有骨架但未贯彻**（低）。:root 定义了变量（styles.css:1-14），但 #edf2ff、#4760aa、#f8fafc 等大量硬编码散落，主题化前需收敛。
19. 无 .gitignore、README、LICENSE、测试、CI。

## 五、可复用资产（Phase 2+ 直接移植）

| 现有代码 | 去向 |
|---|---|
| toISODate / addDays / monthKey / formatDate / shortDate / todayISO / getCalendarDays（app.js:10-39, 225-238） | `src/utils/date.ts` + 单测 |
| getOccurrences（app.js:191-202） | `src/utils/ebbinghaus.ts` 的 `generateReviewDates()`，语义定死为"偏移天数" |
| getStatus / getDueEntries（app.js:204-223） | `src/services/events.ts` 查询层 |
| openDB / loadState / saveState + localStorage 回退（app.js:140-189） | `src/services/database/` adapter 接口的 IndexedDB 实现（Phase 11 换 SQLite） |
| 备份 payload 结构（含 version 字段）、backupPayload 剥离逻辑（app.js:69-79） | `src/services/migration.ts` 的 v1→v2 入口 |
| Ebbinghaus_backup.json（真实数据） | migration 测试 fixture，保证旧数据零丢失 |
| styles.css 的 :root 变量、卡片/日历/时间轴视觉语言 | Phase 2 React 版样式基础，先收敛硬编码色值 |
| escapeHtml（app.js:461-467） | React 自动转义后不再需要，但"渲染前转义"的意识要延续到 data 属性 |

## 六、必须重构的部分

1. 全局可变 `state` + `render()` 全量重绘 → Zustand stores + React 声明式渲染。
2. 计划中心模型 → Event / ReviewPlan / ReviewRule / Category / Settings 五实体模型；完成状态挂 Event。
3. 手写 Modal → 通用 Dialog 组件（焦点管理、Esc、aria）。
4. 导入导出、备份、存储与 UI 解耦 → 独立 services。
5. 事件绑定从 render 尾部散落代码 → 组件内声明式绑定。

## 七、与最终目标差距

| 维度 | 现状 | 目标 |
|---|---|---|
| 模型 | Plan + (planId,date) 完成记录 | Event / ReviewPlan / ReviewRule / Category / Settings / Background |
| UI | 原生三栏单页 | React 组件化：侧边栏 + 月历 + 今日/选中日期面板 |
| 事项 | 仅艾宾浩斯计划 | 普通事项 + 艾宾浩斯事项，完整 CRUD + 移动 + 日期同步调整 |
| 数据 | IndexedDB（浏览器内） | SQLite（Rust/Tauri 管理） |
| 分发 | 浏览器打开 | Windows EXE（Tauri 2） |

---

# Phase 1 实施方案（数据模型 + 工程底座）

**目标**：建立可运行、可测试的 Vite + TypeScript 工程骨架，落地五实体类型、日期/艾宾浩斯纯函数、v1→v2 数据迁移（含真实数据 fixture 测试）。**UI 零改动**——现有原型作为入口照常可用，Phase 2 再换 React。

**关键决策（建议采纳）**：
- D1 intervals 语义 = 距 Day0 的偏移天数（保持现行为，与真实数据一致）；文案统一为"复习时间点（天）"。
- D2 日期一律 `YYYY-MM-DD` 本地日期，不做时区换算（保持现行为）。
- D3 ReviewRule 按 intervals 序列去重：迁移时每种不同序列生成一条 rule，plan 引用 ruleId；[1,2,4,7,15] 命名为"标准"。
- D4 v1 plan → 1 ReviewPlan + 1 ReviewRule + (1 Day0 + N 复习) 个 Event；`reviewIndex` 0..N；`completions[planId][date]` 映射为对应 Event.completed=true。
- D5 `selectedDate` / `currentView` 迁入 settings 持久化，行为不变。

**步骤**：
1. 基线：补 .gitignore（node_modules / dist）；`git tag v0.1-prototype`；基线 commit。
2. 工程：`package.json`（vite / typescript / vitest）、`tsconfig.json`、`vite.config.ts`；现有 index.html + app.js + styles.css 原样保留为 Vite 入口（纯 JS 无 import，dev server 直接可用）。
3. 类型：`src/types/` —— event.ts / review.ts / category.ts / settings.ts / background.ts / state.ts（含 v1 Legacy 形状，供 migration 使用）。
4. `src/utils/date.ts`：移植现有日期函数 + 单测（含闰年、跨月边界）。
5. `src/utils/ebbinghaus.ts`：`generateReviewDates(startDate, intervals)` + 单测（空数组、[1,2,4,7,15]、边界）。
6. `src/services/migration.ts`：`migrateV1ToV2(v1State)` —— 实体拆分、rule 去重、completions 映射、settings/selectedDate 保留；用真实 Ebbinghaus_backup.json 做 fixture 测试，保证 3 个计划 → 3 计划 + 3 规则 + 18 事件、3 条完成记录零丢失。
7. `src/services/storage.ts`：定义 StorageAdapter 接口（load/save 签名），Phase 2 实现 IndexedDB adapter，Phase 11 换 SQLite。
8. 验收：`npm run dev` 打开与现在功能完全一致的原型；`npm test` 全绿；migration round-trip 校验通过。
9. 独立 commit：`phase-1-data-model`。

**对原 16-Phase 总 Plan 的两点修正建议**（审计发现）：
- Phase 4 必须补"取消完成"（现原型就没有）。
- Phase 3 的"点击日期查看安排"必须做成选中日期事项面板，不能延续现在"文案有、功能无"的状态。
- 时间轴逾期渲染（缺陷 11）在 Phase 2 移植时顺手修正，不要带进新代码。

**风险**：migration 是全项目最关键路径，必须 fixture 测试 + 导出 v2 前自动备份 v1 JSON；D1 语义一旦定死，后续不得变更（否则需要 v3 迁移）。
