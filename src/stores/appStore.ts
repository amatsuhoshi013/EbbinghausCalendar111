import { create } from "zustand";
import { createReviewPlanEntities } from "../services/reviews";
import type { StorageAdapter } from "../services/storage";
import type { ReviewRule } from "../types/review";
import type { V2State } from "../types/state";
import { toISODate, todayISO } from "../utils/date";
import { DEFAULT_INTERVALS } from "../utils/ebbinghaus";
import { uid } from "../utils/id";

export interface NewReviewPlanInput {
  title: string;
  startDate: string;
  intervals: number[];
  note?: string;
}

interface AppState extends V2State {
  ready: boolean;
  addReviewPlan(input: NewReviewPlanInput): Promise<void>;
  toggleCompleted(eventId: string): Promise<void>;
  deletePlan(planId: string): Promise<void>;
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

/** 首次启动（无任何历史数据）时的初始状态：标准规则 + 一个示例计划。 */
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
    categories: [],
    events,
    reviewPlans: [plan],
    reviewRules: [standard],
    settings: {
      defaultRuleId: standard.id,
      compactMode: true,
      reviewMinutes: 5,
      selectedDate: todayISO(),
      currentView: "month",
    },
    backgrounds: [],
  };
}

export const useAppStore = create<AppState>()((set, get) => ({
  ...createInitialV2State(),
  ready: false,

  addReviewPlan: async (input) => {
    const created = createReviewPlanEntities(input, get().reviewRules);
    set({
      reviewPlans: [created.plan, ...get().reviewPlans],
      reviewRules: created.rules,
      events: [...created.events, ...get().events],
      settings: { ...get().settings, selectedDate: input.startDate, currentView: "month" },
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

  deletePlan: async (planId) => {
    set({
      reviewPlans: get().reviewPlans.filter((p) => p.id !== planId),
      events: get().events.filter((e) => e.reviewPlanId !== planId),
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
