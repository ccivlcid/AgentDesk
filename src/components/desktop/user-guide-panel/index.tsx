/**
 * UserGuidePanel — AgentDesk 유저 가이드 (AppWindow 일반창)
 * 챕터별 구성, 검색, callout 박스, 인라인 코드, 단축키 카드
 */
import { useState, useMemo } from "react";
import { useI18n } from "../../../i18n";
import AppWindow from "../../windows/AppWindow";
import { getChapters } from "./getChapters";
import { UserGuideSidebar } from "./UserGuideSidebar";
import { UserGuideContent } from "./UserGuideContent";

export default function UserGuidePanel() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState("getting-started");
  const [search, setSearch] = useState("");

  const chapters = useMemo(() => getChapters(t), [t]);
  const chapter = chapters.find((c) => c.id === selectedId) ?? chapters[0];

  const filteredChapters = useMemo(() => {
    if (!search.trim()) return chapters;
    const q = search.toLowerCase();
    return chapters.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      c.sections.some((s) =>
        s.heading.toLowerCase().includes(q) ||
        (s.body ?? "").toLowerCase().includes(q)
      )
    );
  }, [chapters, search]);

  const handleSelectChapter = (id: string) => {
    setSelectedId(id);
    setSearch("");
  };

  return (
    <AppWindow
      windowType="user-guide"
      title={t({ ko: "AgentDesk 사용 가이드", en: "AgentDesk User Guide", ja: "AgentDeskユーザーガイド", zh: "AgentDesk用户指南" })}
      emoji="📖"
      defaultWidth={660}
      defaultHeight={580}
    >
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        <UserGuideSidebar
          search={search}
          setSearch={setSearch}
          filteredChapters={filteredChapters}
          selectedId={selectedId}
          onSelectChapter={handleSelectChapter}
          t={t}
        />
        <UserGuideContent chapter={chapter} />
      </div>
    </AppWindow>
  );
}
