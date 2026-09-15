import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import type { Event, Priority } from "../../types/event";
import { DEFAULT_INTERVALS, isValidIntervals } from "../../utils/ebbinghaus";

const COLOR_SWATCHES = ["#4a6cf7", "#8b5cf6", "#22c55e", "#ef4444", "#f59e0b", "#0ea5e9", "#ec4899", "#64748b"];

export interface EventDialogProps {
  /** 编辑模式：传入被编辑的事项；否则为新建模式 */
  initial?: Event | null;
  /** 新建模式的默认日期（例如双击日期格） */
  defaultDate?: string;
  onClose: () => void;
}

export function EventDialog({ initial, defaultDate, onClose }: EventDialogProps) {
  const categories = useAppStore((s) => s.categories);
  const addEvent = useAppStore((s) => s.addEvent);
  const updateEvent = useAppStore((s) => s.updateEvent);
  const addReviewPlan = useAppStore((s) => s.addReviewPlan);
  const updateReviewPlan = useAppStore((s) => s.updateReviewPlan);
  const reviewPlans = useAppStore((s) => s.reviewPlans);
  const reviewRules = useAppStore((s) => s.reviewRules);
  const selectedDate = useAppStore((s) => s.settings.selectedDate);

  const isEdit = Boolean(initial);
  const isReview = Boolean(initial?.reviewPlanId);
  const plan = isReview ? reviewPlans.find((p) => p.id === initial!.reviewPlanId) : undefined;
  const planRule = isReview && plan ? reviewRules.find((r) => r.id === plan.ruleId) : undefined;

  const [type, setType] = useState<"plain" | "review">(isReview ? "review" : "plain");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? selectedDate);
  const [intervalsText, setIntervalsText] = useState(planRule?.intervals.join(",") ?? DEFAULT_INTERVALS.join(","));
  const [note, setNote] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [color, setColor] = useState(initial?.color ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "normal");
  const [strategy, setStrategy] = useState<"shift" | "detach">("shift");
  const [error, setError] = useState("");

  const startDateChanged = isReview && plan !== undefined && date !== plan.startDate;

  const heading = useMemo(() => {
    if (isEdit) return "编辑事项";
    return type === "plain" ? "新建事项" : "新建事项";
  }, [isEdit, type]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const parseIntervals = () =>
    intervalsText
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);

  const submit = async () => {
    if (!title.trim() || !date) {
      setError("请填写名称和日期");
      return;
    }
    const intervals = parseIntervals();
    if ((type === "review" || isReview) && !isValidIntervals(intervals)) {
      setError("复习间隔格式不正确：请用逗号分隔的正数，例如 1,2,4,7,15");
      return;
    }
    const common = {
      note: note.trim() || undefined,
      categoryId: categoryId || undefined,
      color: color || undefined,
      priority,
    };

    if (isReview && plan) {
      await updateReviewPlan(
        plan.id,
        {
          title: title.trim(),
          startDate: date,
          intervals,
          note: common.note,
          categoryId: common.categoryId,
          color: common.color,
          priority: common.priority,
        },
        strategy,
        initial!.id,
      );
    } else if (isEdit && initial) {
      await updateEvent(initial.id, {
        title: title.trim(),
        date,
        description: common.note,
        categoryId: common.categoryId,
        color: common.color,
        priority: common.priority,
      });
    } else if (type === "review") {
      await addReviewPlan({
        title: title.trim(),
        startDate: date,
        intervals,
        ...common,
      });
    } else {
      await addEvent({ title: title.trim(), date, ...common });
    }
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2>{heading}</h2>
          <button className="btn ghost" onClick={onClose}>
            关闭
          </button>
        </div>

        {!isEdit && (
          <div className="type-toggle" role="radiogroup" aria-label="事项类型">
            <button
              className={`type-option${type === "plain" ? " active" : ""}`}
              role="radio"
              aria-checked={type === "plain"}
              onClick={() => setType("plain")}
            >
              普通事项
            </button>
            <button
              className={`type-option${type === "review" ? " active" : ""}`}
              role="radio"
              aria-checked={type === "review"}
              onClick={() => setType("review")}
            >
              艾宾浩斯计划
            </button>
          </div>
        )}

        <div className="form-grid">
          <div className="field full">
            <label htmlFor="ev-title">{isReview ? "计划名称" : "标题"}</label>
            <input
              id="ev-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：英语单词 Unit 5"
            />
          </div>
          <div className="field">
            <label htmlFor="ev-date">{type === "review" || isReview ? "开始日期" : "日期"}</label>
            <input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ev-priority">优先级</label>
            <select id="ev-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">低</option>
              <option value="normal">普通</option>
              <option value="high">高</option>
            </select>
          </div>
          {((!isEdit && type === "review") || isReview) && (
            <div className="field full">
              <label htmlFor="ev-intervals">复习间隔（距起始日的天数）</label>
              <input
                id="ev-intervals"
                value={intervalsText}
                onChange={(e) => setIntervalsText(e.target.value)}
                placeholder="1,2,4,7,15"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="ev-category">分类</label>
            <select id="ev-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">无分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>颜色（留空继承分类）</label>
            <div className="swatches" role="radiogroup" aria-label="事项颜色">
              <button
                type="button"
                className={`swatch swatch-auto${color === "" ? " active" : ""}`}
                title="自动"
                onClick={() => setColor("")}
              >
                自动
              </button>
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`swatch${color === c ? " active" : ""}`}
                  style={{ background: c }}
                  title={c}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="field full">
            <label htmlFor="ev-note">备注</label>
            <textarea id="ev-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="可选" />
          </div>
        </div>

        {isReview && plan && startDateChanged && (
          <div className="choice-group" role="radiogroup" aria-label="日期调整策略">
            <p className="choice-hint">开始日期已修改，请选择调整策略：</p>
            <label className={`choice${strategy === "shift" ? " active" : ""}`}>
              <input
                type="radio"
                name="strategy"
                checked={strategy === "shift"}
                onChange={() => setStrategy("shift")}
              />
              <span>
                <strong>同步调整整个计划</strong>
                <small>按新日期重算全部复习，完成状态保留</small>
              </span>
            </label>
            <label className={`choice${strategy === "detach" ? " active" : ""}`}>
              <input
                type="radio"
                name="strategy"
                checked={strategy === "detach"}
                onChange={() => setStrategy("detach")}
              />
              <span>
                <strong>仅修改本次事项</strong>
                <small>该次复习脱离计划，移到新日期</small>
              </span>
            </label>
          </div>
        )}

        {error && <div className="form-error">{error}</div>}
        <div className="dialog-actions">
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" onClick={() => void submit()}>
            {isEdit ? "保存" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}
