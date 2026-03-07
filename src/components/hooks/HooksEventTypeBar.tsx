import { ALL_EVENT_TYPES, EVENT_TYPE_ICONS, eventTypeLabel, type TFunction } from "./model";

interface HooksEventTypeBarProps {
  t: TFunction;
  selectedEventType: string;
  onSelectEventType: (eventType: string) => void;
  eventTypeCounts: Record<string, number>;
  filteredLength: number;
  search: string;
}

export default function HooksEventTypeBar({
  t,
  selectedEventType,
  onSelectEventType,
  eventTypeCounts,
  filteredLength,
  search,
}: HooksEventTypeBarProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {ALL_EVENT_TYPES.map((eventType) => {
          const isActive = selectedEventType === eventType;
          return (
            <button
              key={eventType}
              onClick={() => onSelectEventType(eventType)}
              className="px-3 py-1.5 text-xs font-medium font-mono border transition-all"
              style={{
                borderRadius: "2px",
                background: isActive ? "rgba(251,191,36,0.1)" : "var(--th-bg-elevated)",
                borderColor: isActive ? "rgba(251,191,36,0.5)" : "var(--th-border)",
                color: isActive ? "var(--th-accent)" : "var(--th-text-secondary)",
              }}
            >
              {EVENT_TYPE_ICONS[eventType]} {eventTypeLabel(eventType, t)}
              <span className="ml-1" style={{ color: "var(--th-text-muted)" }}>{eventTypeCounts[eventType] || 0}</span>
            </button>
          );
        })}
      </div>

      <div className="text-xs px-1 font-mono" style={{ color: "var(--th-text-muted)" }}>
        {filteredLength}
        {t({ ko: "개 훅 표시중", en: " hooks shown", ja: "件のフックを表示中", zh: " 个钩子已显示" })}
        {search &&
          ` · "${search}" ${t({ ko: "검색 결과", en: "search results", ja: "検索結果", zh: "搜索结果" })}`}
      </div>
    </>
  );
}
