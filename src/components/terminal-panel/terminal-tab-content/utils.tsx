import type { ReactNode } from "react";

/** Output 탭 raw 모드에서 검색어 하이라이트 */
export function highlightSearchMatches(text: string, search: string): ReactNode {
  if (!search) return text;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} className="bg-yellow-400/40 text-yellow-200 rounded-sm px-[1px]">{part}</mark>
      : part,
  );
}
