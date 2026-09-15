import { create } from "zustand";
import { withDefaultCategories } from "../services/categories";
import { createReviewPlanEntities, resolveRule } from "../services/reviews";
import { detachReviewEvent, moveReviewEvent, rescheduleReviewEvents, type MoveReviewMode } from "../services/reviewPlanService";
import type { StorageAdapter } from "../services/storage";
import type { Background } from "../types/background";
import type { Event, Priority } from "../types/event";
import type { ReviewPlan, ReviewRule } from "../types/review";
import type { Settings } from "../types/settings";
import type { V2State } from "../types/state";
import { toISODate, todayISO } from "../utils/date";
import { DEFAULT_INTERVALS } from "../utils/ebbinghaus";
import { uid } from "../utils/id";

export interface NewEventInput {
  title: string;
  date: string;
  description?: string;
  categoryId?: string;
  color?: string;
  priority?: Priority;
}

export interface EventPatch {
  title?: string;
  /** null 表示清除备注 */
  description?: string | null;
  date?: string;
  /** null 表示清除分类 */
  categoryId?: string | null;
  /** null 表示清除颜色覆盖 */
  color?: string | null;
  priority?: Priority;
}

export interface NewReviewPlanInput {
  title: string;
  startDate: string;
  intervals: number[];
  note?: string;
  categoryId?: string;
  color?: string;
  priority?: Priority;
}

export interface ReviewPlanPatch {
  title?: string;
  startDate?: string;
  intervals?: number[];
  /** null 表示清除备注 */
  note?: string | null;
  /** null 表示清除分类 */
  categoryId?: string | null;
  /** null 表示清除颜色覆盖 */
  color?: string | null;
  priority?: Priority;
}

interface AppState extends V2State {
  ready: boolean;
  /** 当前页面（会话级 UI 状态，不持久化） */
  page: "calendar" | "statistics" | "settings";
  setPage(page: "calendar" | "statistics" | "settings"): void;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  addBackground(name: string, blob: Blob): Promise<void>;
  updateBackground(id: string, patch: Partial<Background>): Promise<void>;
  removeBackground(id: string): Promise<void>;
  addEvent(input: NewEventInput): Promise<void>;
  updateEvent(eventId: string, patch: EventPatch): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  moveEvent(eventId: string, date: string): Promise<void>;
  duplicateEvent(eventId: string): Promise<void>;
  addReviewPlan(input: NewReviewPlanInput): Promise<void>;
  updateReviewPlan(
    planId: string,
    patch: ReviewPlanPatch,
    mode: MoveReviewMode,
    sourceEventId?: string,
  ): Promise<void>;
  moveReviewEventById(eventId: string, newDate: string, mode: MoveReviewMode): Promise<void>;
  deleteReviewEvent(eventId: string): Promise<void>;
  deleteReviewPlan(planId: string): Promise<void>;
  toggleCompleted(eventId: string): Promise<void>;
  replaceState(state: V2State): Promise<void>;
  selectDate(date: string): void;
  selectMonth(month: string): void;
  shiftMonth(delta: number): void;
  gotoToday(): void;
}

let storage: StorageAdapter | null = null;

/** 在渲染前由入口注入；测试可注入 MemoryStorageAdapter。 */
export function setStorageAdapter(adapter: StorageAdapter | null): void {
  storage = adapter;
}

/** 供底图加载等场景读取当前适配器。 */
export function getStorageAdapter(): StorageAdapter | null {
  return storage;
}

function toV2(state: AppState): V2State {
  return {
    version: 2,
    categories: state.categories,
    events: state.events,
    reviewPlans: state.reviewPlans,
    reviewRules: state.reviewRules,
    settings: state.settings,
    backgrounds: state.backgrounds,
  };
}

async function persist(state: AppState): Promise<void> {
  await storage?.save(toV2(state));
}

/** 首次启动（无任何历史数据）时的初始状态：默认分类 + 标准规则 + 一个示例计划。 */
export function createInitialV2State(): V2State {
  const timestamp = new Date().toISOString();
  const standard: ReviewRule = {
    id: uid(),
    name: "标准",
    intervals: [...DEFAULT_INTERVALS],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const { plan, events } = createReviewPlanEntities(
    {
      title: "医学复习计划",
      startDate: todayISO(),
      intervals: DEFAULT_INTERVALS,
      note: "示例计划，可直接删除后新建自己的内容",
    },
    [standard],
  );
  return {
    version: 2,
    categories: withDefaultCategories([]),
    events,
    reviewPlans: [plan],
    reviewRules: [standard],
    settings: {
      defaultRuleId: standard.id,
      compactMode: true,
      reviewMinutes: 5,
      selectedDate: todayISO(),
      currentView: "month",
      theme: "system",
      fontScale: "normal",
      weekStartsOn: "sunday",
      primaryColor: "#4a6cf7",
    },
    backgrounds: [],
  };
}

function eventFields(input: { note?: string; categoryId?: string; color?: string; priority?: Priority }) {
  return {
    description: input.note || undefined,
    categoryId: input.categoryId,
    color: input.color,
    priority: input.priority,
  };
}

export const useAppStore = create<AppState>()((set, get) => ({
  ...createInitialV2State(),
  ready: false,
  page: "calendar",

  setPage: (page) => set({ page }),

  updateSettings: async (patch) => {
    set({ settings: { ...get().settings, ...patch } });
    await persist(get());
  },

  addBackground: async (name, blob) => {
    const timestamp = new Date().toISOString();
    const background: Background = {
      id: uid(),
      name,
      overlayOpacity: 0,
      blur: 0,
      brightness: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await storage?.saveBackgroundImage(background.id, blob);
    set({
      backgrounds: [...get().backgrounds, background],
      settings: { ...get().settings, backgroundId: background.id },
    });
    await persist(get());
  },

  updateBackground: async (id, patch) => {
    set({
      backgrounds: get().backgrounds.map((b) =>
        b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b,
      ),
    });
    await persist(get());
  },

  removeBackground: async (id) => {
    await storage?.deleteBackgroundImage(id);
    const { settings } = get();
    set({
      backgrounds: get().backgrounds.filter((b) => b.id !== id),
      settings: settings.backgroundId === id ? { ...settings, backgroundId: undefined } : settings,
    });
    await persist(get());
  },

  addEvent: async (input) => {
    const timestamp = new Date().toISOString();
    const event: Event = {
      id: uid(),
      title: input.title,
      description: input.description,
      date: input.date,
      completed: false,
      categoryId: input.categoryId,
      color: input.color,
      priority: input.priority,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set({
      events: [event, ...get().events],
      settings: { ...get().settings, selectedDate: input.date, currentView: "month" },
    });
    await persist(get());
  },

  updateEvent: async (eventId, patch) => {
    set({
      events: get().events.map((e) => {
        if (e.id !== eventId) return e;
        // 只应用 patch 中显式提供的字段，未提供的字段保持原值
        const next: Event = { ...e, updatedAt: new Date().toISOString() };
        if (patch.title !== undefined) next.title = patch.title;
        if (patch.description !== undefined) next.description = patch.description || undefined;
        if (patch.date !== undefined) next.date = patch.date;
        if (patch.categoryId !== undefined) next.categoryId = patch.categoryId ?? undefined;
        if (patch.color !== undefined) next.color = patch.color ?? undefined;
        if (patch.priority !== undefined) next.priority = patch.priority;
        return next;
      }),
    });
    await persist(get());
  },

  deleteEvent: async (eventId) => {
    set({ events: get().events.filter((e) => e.id !== eventId) });
    await persist(get());
  },

  moveEvent: async (eventId, date) => {
    set({
      events: get().events.map((e) =>
        e.id === eventId ? { ...e, date, updatedAt: new Date().toISOString() } : e,
      ),
    });
    await persist(get());
  },

  duplicateEvent: async (eventId) => {
    const source = get().events.find((e) => e.id === eventId);
    if (!source) return;
    const timestamp = new Date().toISOString();
    const copy: Event = {
      ...source,
      id: uid(),
      title: `${source.title} 副本`,
      completed: false,
      reviewPlanId: undefined,
      reviewIndex: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set({ events: [copy, ...get().events] });
    await persist(get());
  },

  addReviewPlan: async (input) => {
    const created = createReviewPlanEntities(input, get().reviewRules);
    const decorated = created.events.map((e) => ({ ...e, ...eventFields(input) }));
    set({
      reviewPlans: [created.plan, ...get().reviewPlans],
      reviewRules: created.rules,
      events: [...decorated, ...get().events],
      settings: { ...get().settings, selectedDate: input.startDate, currentView: "month" },
    });
    await persist(get());
  },

  updateReviewPlan: async (planId, patch, mode, sourceEventId) => {
    const state = get();
    const plan = state.reviewPlans.find((p) => p.id === planId);
    if (!plan) return;
    const now = new Date();
    const intervals = patch.intervals ?? state.reviewRules.find((r) => r.id === plan.ruleId)?.intervals ?? [];
    const resolved = resolveRule(intervals, state.reviewRules, now);
    const startDateChanged = patch.startDate !== undefined && patch.startDate !== plan.startDate;

    const patchedPlan: ReviewPlan = {
      ...plan,
      title: patch.title ?? plan.title,
      startDate: startDateChanged && mode === "shift" ? patch.startDate! : plan.startDate,
      ruleId: resolved.rule.id,
      updatedAt: now.toISOString(),
    };

    let events = state.events;
    if (startDateChanged && mode === "detach" && sourceEventId) {
      // 仅本次事项：该次复习脱离计划移到新日期；计划的其余事项照常应用标题/备注/分类修改
      events = detachReviewEvent(events, sourceEventId, patch.startDate!, now);
    } else if (startDateChanged || patch.intervals) {
      // 同步移动 / 重新生成：从（新的）起始日按规则重算，完成状态按复习序号保留
      ({ events } = rescheduleReviewEvents(patchedPlan, resolved.rule, events, patchedPlan.startDate, now));
    }
    // 计划级字段同步到该计划的所有事件：只应用 patch 中显式提供的字段，未提供的保持原值
    events = events.map((e) => {
      if (e.reviewPlanId !== planId) return e;
      const next: Event = { ...e, title: patchedPlan.title };
      if (patch.note !== undefined) next.description = patch.note || undefined;
      if (patch.categoryId !== undefined) next.categoryId = patch.categoryId ?? undefined;
      if (patch.color !== undefined) next.color = patch.color ?? undefined;
      if (patch.priority !== undefined) next.priority = patch.priority;
      return next;
    });

    set({
      reviewPlans: state.reviewPlans.map((p) => (p.id === planId ? patchedPlan : p)),
      reviewRules: resolved.rules,
      events,
    });
    await persist(get());
  },

  moveReviewEventById: async (eventId, newDate, mode) => {
    const state = get();
    const event = state.events.find((e) => e.id === eventId);
    if (!event?.reviewPlanId) return;
    const plan = state.reviewPlans.find((p) => p.id === event.reviewPlanId);
    const rule = state.reviewRules.find((r) => r.id === plan?.ruleId);
    if (!plan || !rule) return;
    const result = moveReviewEvent(plan, rule, state.events, eventId, newDate, mode);
    const plans = result.plan === plan ? state.reviewPlans : state.reviewPlans.map((p) => (p.id === plan.id ? result.plan : p));
    set({ events: result.events, reviewPlans: plans });
    await persist(get());
  },

  deleteReviewEvent: async (eventId) => {
    set({ events: get().events.filter((e) => e.id !== eventId) });
    await persist(get());
  },

  deleteReviewPlan: async (planId) => {
    set({
      reviewPlans: get().reviewPlans.filter((p) => p.id !== planId),
      events: get().events.filter((e) => e.reviewPlanId !== planId),
    });
    await persist(get());
  },

  toggleCompleted: async (eventId) => {
    set({
      events: get().events.map((e) =>
        e.id === eventId ? { ...e, completed: !e.completed, updatedAt: new Date().toISOString() } : e,
      ),
    });
    await persist(get());
  },

  replaceState: async (next) => {
    set({
      version: 2,
      categories: withDefaultCategories(next.categories),
      events: next.events,
      reviewPlans: next.reviewPlans,
      reviewRules: next.reviewRules,
      settings: next.settings,
      backgrounds: next.backgrounds,
    });
    await persist(get());
  },

  selectDate: (date) => {
    set({ settings: { ...get().settings, selectedDate: date, currentView: "month" } });
    void persist(get());
  },

  selectMonth: (month) => {
    set({ settings: { ...get().settings, selectedDate: `${month}-01`, currentView: "month" } });
    void persist(get());
  },

  shiftMonth: (delta) => {
    const current = new Date(`${get().settings.selectedDate.slice(0, 7)}-01T00:00:00`);
    current.setMonth(current.getMonth() + delta);
    set({ settings: { ...get().settings, selectedDate: toISODate(current), currentView: "month" } });
    void persist(get());
  },

  gotoToday: () => {
    set({ settings: { ...get().settings, selectedDate: todayISO(), currentView: "today" } });
    void persist(get());
  },
}));
