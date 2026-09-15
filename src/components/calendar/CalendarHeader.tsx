import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { monthKey } from "../../utils/date";

export function CalendarHeader() {
  const selectedDate = useAppStore((s) => s.settings.selectedDate);
  const shiftMonth = useAppStore((s) => s.shiftMonth);
  const selectMonth = useAppStore((s) => s.selectMonth);
  const gotoToday = useAppStore((s) => s.gotoToday);
  const month = monthKey(selectedDate);
  const label = `${month.slice(0, 4)}年${Number(month.slice(5, 7))}月`;

  return (
    <div className="calendar-header">
      <div className="month-nav">
        <button className="icon-btn" aria-label="上个月" onClick={() => shiftMonth(-1)}>
          <ChevronLeft size={20} />
        </button>
        <h2>{label}</h2>
        <button className="icon-btn" aria-label="下个月" onClick={() => shiftMonth(1)}>
          <ChevronRight size={20} />
        </button>
        <input
          className="month-picker"
          type="month"
          value={month}
          aria-label="跳转到月份"
          onChange={(e) => {
            if (e.target.value) selectMonth(e.target.value);
          }}
        />
      </div>
      <button className="btn ghost" onClick={gotoToday}>
        今天
      </button>
    </div>
  );
}
