import { useAppStore } from "../../stores/appStore";
import type { Event } from "../../types/event";
import type { MoveReviewMode } from "../../services/reviewPlanService";

export function MoveStrategyDialog({
  event,
  targetDate,
  onClose,
}: {
  event: Event;
  targetDate: string;
  onClose: () => void;
}) {
  const moveReviewEventById = useAppStore((s) => s.moveReviewEventById);

  const act = async (mode: MoveReviewMode) => {
    await moveReviewEventById(event.id, targetDate, mode);
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card dialog dialog-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2>移动艾宾浩斯事项</h2>
          <button className="btn ghost" onClick={onClose}>
            关闭
          </button>
        </div>
        <p className="dialog-desc">
          把「{event.title}」的第 {event.reviewIndex ?? 0} 次复习移动到 {targetDate}，请选择移动方式：
        </p>
        <div className="dialog-options">
          <button className="btn ghost option-btn" onClick={() => void act("detach")}>
            <span>
              <strong>仅移动本次复习</strong>
              <small>该次复习脱离计划，其他复习日期不变</small>
            </span>
          </button>
          <button className="btn primary option-btn" onClick={() => void act("shift")}>
            <span>
              <strong>同步移动整个计划</strong>
              <small>全部复习平移相同天数，完成状态保留</small>
            </span>
          </button>
        </div>
        <div className="dialog-actions">
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
