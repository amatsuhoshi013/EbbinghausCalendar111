import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { todayISO } from "../../utils/date";
import { DEFAULT_INTERVALS, isValidIntervals } from "../../utils/ebbinghaus";

export function EventDialog({ onClose }: { onClose: () => void }) {
  const addReviewPlan = useAppStore((s) => s.addReviewPlan);
  const selectedDate = useAppStore((s) => s.settings.selectedDate);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(selectedDate >= todayISO() ? selectedDate : todayISO());
  const [intervalsText, setIntervalsText] = useState(DEFAULT_INTERVALS.join(","));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    const intervals = intervalsText
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!title.trim() || !startDate) {
      setError("请填写名称和开始日期");
      return;
    }
    if (!isValidIntervals(intervals)) {
      setError("复习间隔格式不正确：请用逗号分隔的正数，例如 1,2,4,7,15");
      return;
    }
    await addReviewPlan({ title: title.trim(), startDate, intervals, note: note.trim() || undefined });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2>新建艾宾浩斯计划</h2>
          <button className="btn ghost" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="plan-title">计划名称</label>
            <input
              id="plan-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：英语单词 Unit 5"
            />
          </div>
          <div className="field">
            <label htmlFor="plan-start">开始日期</label>
            <input id="plan-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="plan-intervals">复习间隔（距起始日的天数）</label>
            <input
              id="plan-intervals"
              value={intervalsText}
              onChange={(e) => setIntervalsText(e.target.value)}
              placeholder="1,2,4,7,15"
            />
          </div>
          <div className="field full">
            <label htmlFor="plan-note">备注</label>
            <textarea id="plan-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="可选" />
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="dialog-actions">
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" onClick={() => void submit()}>
            确认添加
          </button>
        </div>
      </div>
    </div>
  );
}
