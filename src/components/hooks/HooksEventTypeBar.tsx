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
        {ALL_EVENT_TYPES.map((eventType) => (
          <button
            key={eventType}
            onClick={() => onSelectEventType(eventType)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              selectedEventType === eventType
                ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                : "bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-700/40 hover:text-slate-300"
            }`}
          >
            {EVENT_TYPE_ICONS[eventType]} {eventTypeLabel(eventType, t)}
            <span className="ml-1 text-slate-500">{eventTypeCounts[eventType] || 0}</span>
          </button>
        ))}
      </div>

      <div className="text-xs text-slate-500 px-1">
        {filteredLength}
        {t({ ko: "\uAC1C \uD6C5 \uD45C\uC2DC\uC911", en: " hooks shown", ja: "\u4EF6\u306E\u30D5\u30C3\u30AF\u3092\u8868\u793A\u4E2D", zh: " \u4E2A\u94A9\u5B50\u5DF2\u663E\u793A" })}
        {search &&
          ` \u00B7 "${search}" ${t({ ko: "\uAC80\uC0C9 \uACB0\uACFC", en: "search results", ja: "\u691C\u7D22\u7D50\u679C", zh: "\u641C\u7D22\u7ED3\u679C" })}`}
      </div>
    </>
  );
}
