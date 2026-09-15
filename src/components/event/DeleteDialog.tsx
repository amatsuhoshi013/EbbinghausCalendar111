import { useAppStore } from "../../stores/appStore";
import type { Event } from "../../types/event";

export function DeleteDialog({ event, onClose }: { event: Event; onClose: () => void }) {
  const deleteEvent = useAppStore((s) => s.deleteEvent);
  const deleteReviewEvent = useAppStore((s) => s.deleteReviewEvent);
  const deleteReviewPlan = useAppStore((s) => s.deleteReviewPlan);
  const isReview = Boolean(event.reviewPlanId);

  const act = async (fn: () => Promise<void>) => {
    await fn();
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card dialog dialog-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2>删除事项</h2>
          <button className="btn ghost" onClick={onClose}>
            关闭
          </button>
        </div>
        <p className="dialog-desc">
          {isReview ? (
            <>
              「{event.title}」是艾宾浩斯计划中的一次复习，请选择删除范围：
            </>
          ) : (
            <>
              确定删除普通事项「{event.title}」吗？此操作不可撤销。
            </>
          )}
        </p>
        {isReview ? (
          <div className="dialog-options">
            <button className="btn ghost option-btn" onClick={() => void act(() => deleteReviewEvent(event.id))}>
              <span>
                <strong>仅删除本次复习</strong>
                <small>计划的其他复习保持不变</small>
              </span>
            </button>
            <button
              className="btn danger option-btn"
              onClick={() => void act(() => deleteReviewPlan(event.reviewPlanId!))}
            >
              <span>
                <strong>删除整个复习计划</strong>
                <small>删除该计划的全部事项与完成记录</small>
              </span>
            </button>
          </div>
        ) : (
          <div className="dialog-options">
            <button className="btn danger option-btn" onClick={() => void act(() => deleteEvent(event.id))}>
              <span>
                <strong>删除事项</strong>
                <small>不可撤销</small>
              </span>
            </button>
          </div>
        )}
        <div className="dialog-actions">
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
