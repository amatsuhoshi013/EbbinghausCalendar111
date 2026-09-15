import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStorageAdapter } from "../src/services/storage";
import { createInitialV2State, setStorageAdapter, useAppStore } from "../src/stores/appStore";

let adapter: MemoryStorageAdapter;

function snapshot() {
  const data = adapter.getSnapshot();
  if (!data) throw new Error("storage snapshot missing");
  return data;
}

function resetStore() {
  useAppStore.setState({ ...createInitialV2State(), ready: true });
}

beforeEach(() => {
  adapter = new MemoryStorageAdapter();
  setStorageAdapter(adapter);
  resetStore();
});

describe("appStore：普通事项", () => {
  it("addEvent 添加普通事项并持久化", async () => {
    await useAppStore.getState().addEvent({ title: "开会", date: "2026-09-16" });
    const state = useAppStore.getState();
    expect(state.events.find((e) => e.title === "开会")).toMatchObject({ completed: false, date: "2026-09-16" });
    expect(snapshot().events.find((e) => e.title === "开会")).toBeTruthy();
  });

  it("updateEvent 修改标题与日期", async () => {
    await useAppStore.getState().addEvent({ title: "开会", date: "2026-09-16" });
    const id = useAppStore.getState().events.find((e) => e.title === "开会")!.id;
    await useAppStore.getState().updateEvent(id, { title: "改期会", date: "2026-09-20" });
    const updated = useAppStore.getState().events.find((e) => e.id === id)!;
    expect(updated.title).toBe("改期会");
    expect(updated.date).toBe("2026-09-20");
  });

  it("moveEvent 移动日期", async () => {
    await useAppStore.getState().addEvent({ title: "开会", date: "2026-09-16" });
    const id = useAppStore.getState().events.find((e) => e.title === "开会")!.id;
    await useAppStore.getState().moveEvent(id, "2026-09-18");
    expect(useAppStore.getState().events.find((e) => e.id === id)!.date).toBe("2026-09-18");
    expect(snapshot().events.find((e) => e.id === id)!.date).toBe("2026-09-18");
  });

  it("duplicateEvent 复制为新事项", async () => {
    await useAppStore.getState().addEvent({ title: "开会", date: "2026-09-16" });
    const source = useAppStore.getState().events.find((e) => e.title === "开会")!;
    await useAppStore.getState().duplicateEvent(source.id);
    const copy = useAppStore.getState().events.find((e) => e.title === "开会 副本")!;
    expect(copy.id).not.toBe(source.id);
    expect(copy.completed).toBe(false);
    expect(copy.date).toBe(source.date);
  });

  it("deleteEvent 只删除目标事项", async () => {
    await useAppStore.getState().addEvent({ title: "A", date: "2026-09-16" });
    await useAppStore.getState().addEvent({ title: "B", date: "2026-09-17" });
    const a = useAppStore.getState().events.find((e) => e.title === "A")!;
    await useAppStore.getState().deleteEvent(a.id);
    expect(useAppStore.getState().events.some((e) => e.title === "A")).toBe(false);
    expect(useAppStore.getState().events.some((e) => e.title === "B")).toBe(true);
  });

  it("toggleCompleted 完成/取消完成并持久化", async () => {
    await useAppStore.getState().addEvent({ title: "开会", date: "2026-09-16" });
    const id = useAppStore.getState().events.find((e) => e.title === "开会")!.id;
    await useAppStore.getState().toggleCompleted(id);
    expect(useAppStore.getState().events.find((e) => e.id === id)!.completed).toBe(true);
    expect(snapshot().events.find((e) => e.id === id)!.completed).toBe(true);
    await useAppStore.getState().toggleCompleted(id);
    expect(useAppStore.getState().events.find((e) => e.id === id)!.completed).toBe(false);
  });
});

describe("appStore：艾宾浩斯计划", () => {
  async function createPlan(startDate = "2026-09-09") {
    await useAppStore.getState().addReviewPlan({
      title: "医学复习",
      startDate,
      intervals: [1, 2, 4, 7, 15],
    });
    const plan = useAppStore.getState().reviewPlans.find((p) => p.title === "医学复习")!;
    const events = useAppStore.getState().events.filter((e) => e.reviewPlanId === plan.id);
    return { plan, events };
  }

  it("addReviewPlan 生成 Day0 + 5 次复习并复用规则", async () => {
    const { plan, events } = await createPlan();
    expect(events).toHaveLength(6);
    expect(events.map((e) => e.date)).toEqual([
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-13",
      "2026-09-16",
      "2026-09-24",
    ]);
    const rules = useAppStore.getState().reviewRules;
    expect(rules.filter((r) => r.id === plan.ruleId)).toHaveLength(1);
    expect(rules.filter((r) => r.intervals.join(",") === "1,2,4,7,15")).toHaveLength(1);
  });

  it("updateReviewPlan shift：改起始日 → 全部复习平移，完成状态按序号保留", async () => {
    const { plan, events } = await createPlan();
    await useAppStore.getState().toggleCompleted(events[3].id);
    await useAppStore.getState().updateReviewPlan(
      plan.id,
      { title: "医学复习", startDate: "2026-09-11" },
      "shift",
      events[0].id,
    );
    const after = useAppStore.getState().events.filter((e) => e.reviewPlanId === plan.id);
    expect(after.map((e) => e.date)).toEqual([
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
      "2026-09-15",
      "2026-09-18",
      "2026-09-26",
    ]);
    expect(after.find((e) => e.reviewIndex === 3)!.completed).toBe(true);
    expect(useAppStore.getState().reviewPlans.find((p) => p.id === plan.id)!.startDate).toBe("2026-09-11");
  });

  it("updateReviewPlan detach：仅本次事项脱离计划", async () => {
    const { plan, events } = await createPlan();
    await useAppStore.getState().updateReviewPlan(
      plan.id,
      { title: "医学复习", startDate: "2026-09-20" },
      "detach",
      events[0].id,
    );
    const state = useAppStore.getState();
    const detached = state.events.find((e) => e.id === events[0].id)!;
    expect(detached.date).toBe("2026-09-20");
    expect(detached.reviewPlanId).toBeUndefined();
    expect(state.reviewPlans.find((p) => p.id === plan.id)!.startDate).toBe("2026-09-09");
    expect(state.events.filter((e) => e.reviewPlanId === plan.id)).toHaveLength(5);
  });

  it("updateReviewPlan 改间隔 → 重新生成复习日期", async () => {
    const { plan, events } = await createPlan();
    await useAppStore.getState().toggleCompleted(events[1].id);
    await useAppStore.getState().updateReviewPlan(plan.id, { title: "医学复习", intervals: [1, 3] }, "shift", events[0].id);
    const after = useAppStore.getState().events.filter((e) => e.reviewPlanId === plan.id);
    expect(after.map((e) => e.date)).toEqual(["2026-09-09", "2026-09-10", "2026-09-12"]);
    expect(after.find((e) => e.reviewIndex === 1)!.completed).toBe(true);
  });

  it("moveReviewEventById shift：移动某次复习 → 整个计划平移", async () => {
    const { plan, events } = await createPlan();
    await useAppStore.getState().moveReviewEventById(events[2].id, "2026-09-18", "shift");
    const state = useAppStore.getState();
    expect(state.reviewPlans.find((p) => p.id === plan.id)!.startDate).toBe("2026-09-16");
    expect(state.events.find((e) => e.id === events[2].id)!.date).toBe("2026-09-18");
  });

  it("moveReviewEventById detach：仅该次复习脱离移动", async () => {
    const { plan, events } = await createPlan();
    await useAppStore.getState().moveReviewEventById(events[4].id, "2026-09-30", "detach");
    const state = useAppStore.getState();
    expect(state.events.find((e) => e.id === events[4].id)!.reviewPlanId).toBeUndefined();
    expect(state.reviewPlans.find((p) => p.id === plan.id)!.startDate).toBe("2026-09-09");
    expect(state.events.filter((e) => e.reviewPlanId === plan.id)).toHaveLength(5);
  });

  it("deleteReviewEvent 只删除该次复习", async () => {
    const { plan, events } = await createPlan();
    await useAppStore.getState().deleteReviewEvent(events[2].id);
    const state = useAppStore.getState();
    expect(state.events.some((e) => e.id === events[2].id)).toBe(false);
    expect(state.events.filter((e) => e.reviewPlanId === plan.id)).toHaveLength(5);
    expect(state.reviewPlans.some((p) => p.id === plan.id)).toBe(true);
  });

  it("deleteReviewPlan 删除整个计划与全部事件", async () => {
    const { plan } = await createPlan();
    await useAppStore.getState().deleteReviewPlan(plan.id);
    const state = useAppStore.getState();
    expect(state.reviewPlans.some((p) => p.id === plan.id)).toBe(false);
    expect(state.events.some((e) => e.reviewPlanId === plan.id)).toBe(false);
  });
});

describe("appStore：导入替换", () => {
  it("replaceState 全量替换并持久化", async () => {
    const next = createInitialV2State();
    await useAppStore.getState().replaceState(next);
    expect(useAppStore.getState().events).toEqual(next.events);
    expect(snapshot().events).toEqual(next.events);
  });
});
