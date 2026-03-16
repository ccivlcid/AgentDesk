import { useEffect, useState } from "react";
import type { WidgetId } from "../../app/types";
import type { CustomFeature, CustomFeatureType } from "../../types";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";
import { listCustomFeatures, deleteCustomFeature } from "../../api/custom-features";
import WidgetBuilderModal from "../widget-builder/WidgetBuilderModal";
import TrafficLights from "./TrafficLights";

const mono = "var(--th-font-mono)";

const WIDGET_IDS: { id: WidgetId; emoji: string; label: string }[] = [
  { id: "heartbeat",  emoji: "💓", label: "Agents" },
  { id: "task-board", emoji: "📋", label: "Tasks" },
  { id: "alerts",     emoji: "🔔", label: "Alerts" },
  { id: "cli-usage",  emoji: "💰", label: "CLI Cost" },
  { id: "flow-graph", emoji: "🕸",  label: "Flow" },
  { id: "file-tree",  emoji: "🗂",  label: "File Tree" },
];

interface WidgetPickerProps {
  onClose: () => void;
}

export default function WidgetPicker({ onClose }: WidgetPickerProps) {
  const { widgetLayout, addWidget, widgetIcons, addWidgetIcon, openCustomApp } = useUiStore();
  const activeWidgetIds = new Set(widgetLayout.map((e) => e.id));
  const { t, language } = useI18n();
  const isKo = language === "ko";

  const [customFeatures, setCustomFeatures] = useState<CustomFeature[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);

  useEffect(() => {
    listCustomFeatures().then(setCustomFeatures).catch(() => {});
  }, []);

  function handleCustomCreated(id: string, type: CustomFeatureType) {
    listCustomFeatures().then(setCustomFeatures).catch(() => {});
    if (type === "widget") {
      addWidget(`custom:${id}` as WidgetId);
    } else {
      openCustomApp(id);
    }
    onClose();
  }

  async function handleDeleteCustom(id: string) {
    await deleteCustomFeature(id).catch(() => {});
    setCustomFeatures((prev) => prev.filter((f) => f.id !== id));
  }

  const WIDGET_DEFS = WIDGET_IDS.map((w) => ({
    ...w,
    desc: w.id === "heartbeat"  ? t({ ko: "에이전트 상태 실시간 목록", en: "Live agent status list", ja: "エージェント状態リスト", zh: "代理状态实时列表" }) :
          w.id === "task-board" ? t({ ko: "실행 중인 태스크 목록", en: "Active task list", ja: "アクティブタスク一覧", zh: "活动任务列表" }) :
          w.id === "alerts"     ? t({ ko: "이상 감지 알림", en: "Anomaly alerts", ja: "異常検知アラート", zh: "异常检测警报" }) :
          w.id === "cli-usage"  ? t({ ko: "CLI 비용 요약", en: "CLI cost summary", ja: "CLIコスト概要", zh: "CLI成本摘要" }) :
          w.id === "flow-graph" ? t({ ko: "에이전트 플로우 그래프", en: "Agent flow graph", ja: "エージェントフローグラフ", zh: "代理流程图" }) :
          t({ ko: "프로젝트 파일 트리", en: "Project file tree", ja: "プロジェクトファイルツリー", zh: "项目文件树" }),
  }));

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={onClose}
      >
        <div
          style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border-strong)", borderRadius: 10, minWidth: 380, maxWidth: 440, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* macOS 타이틀바 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--th-border)", background: "var(--th-glass-bg)", borderTopLeftRadius: 10, borderTopRightRadius: 10, minHeight: 40, flexShrink: 0 }}>
            <TrafficLights onClose={onClose} />
            <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)", letterSpacing: "0.02em" }}>
              {t({ ko: "위젯 / 아이콘 추가", en: "Add Widget / Icon", ja: "ウィジェット追加", zh: "添加小组件" })}
            </span>
          </div>

          {/* 스크롤 본문 */}
          <div style={{ overflowY: "auto", padding: 20, paddingBottom: 28, flex: 1, minHeight: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 14 }}>
            {t({ ko: "위젯: 바탕화면에 패널로 표시 · 아이콘: 바탕화면 앱 아이콘으로 추가", en: "Widget: floating panel · Icon: desktop app icon", ja: "ウィジェット: フロートパネル · アイコン: デスクトップアイコン", zh: "小组件: 浮动面板 · 图标: 桌面应用图标" })}
          </div>

          {/* 기본 위젯 목록 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {WIDGET_DEFS.map((w) => {
              const widgetActive = activeWidgetIds.has(w.id);
              const iconActive = widgetIcons.includes(w.id);
              return (
                <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--th-border)", borderRadius: 6 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{w.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-primary)" }}>{w.label}</div>
                    <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>{w.desc}</div>
                  </div>
                  <button onClick={() => { if (!widgetActive) { addWidget(w.id); onClose(); } }} disabled={widgetActive}
                    style={{ padding: "3px 8px", background: widgetActive ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${widgetActive ? "var(--th-border-accent)" : "var(--th-border)"}`, borderRadius: 4, fontFamily: mono, fontSize: 10, color: widgetActive ? "var(--th-text-accent)" : "var(--th-text-secondary)", cursor: widgetActive ? "default" : "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
                    {widgetActive ? "위젯 ✓" : "위젯"}
                  </button>
                  <button onClick={() => { if (!iconActive) { addWidgetIcon(w.id); onClose(); } }} disabled={iconActive}
                    style={{ padding: "3px 8px", background: iconActive ? "rgba(10,132,255,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${iconActive ? "rgba(10,132,255,0.5)" : "var(--th-border)"}`, borderRadius: 4, fontFamily: mono, fontSize: 10, color: iconActive ? "#0a84ff" : "var(--th-text-secondary)", cursor: iconActive ? "default" : "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
                    {iconActive ? "아이콘 ✓" : "아이콘"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 커스텀 기능 섹션 */}
          <div style={{ borderTop: "1px solid var(--th-border)", marginTop: 14, paddingTop: 14 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 8, letterSpacing: "0.08em" }}>
              {isKo ? "✦ 내 커스텀 기능" : "✦ MY CUSTOM FEATURES"}
            </div>

            {/* 새 기능 만들기 버튼 */}
            <button
              onClick={() => setBuilderOpen(true)}
              style={{ width: "100%", padding: "8px 12px", border: "1px dashed var(--th-border-accent)", borderRadius: 6, background: "rgba(245,158,11,0.05)", fontFamily: mono, fontSize: 11, color: "var(--th-accent)", cursor: "pointer", marginBottom: 8 }}
            >
              + {isKo ? "새 기능 만들기" : "Create New Feature"}
            </button>

            {/* 커스텀 기능 목록 */}
            {customFeatures.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {customFeatures.map((f) => {
                  const widgetId = `custom:${f.id}` as WidgetId;
                  const widgetActive = activeWidgetIds.has(widgetId);
                  return (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--th-border)", borderRadius: 6 }}>
                      <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", padding: "1px 5px", border: "1px solid var(--th-border)", borderRadius: 3 }}>
                        {f.source === "ai" ? "AI" : isKo ? "템플릿" : "tpl"}
                      </span>
                      <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-primary)", flex: 1, minWidth: 0 }} className="truncate">{f.name}</span>
                      {f.type === "widget" ? (
                        <button
                          onClick={() => { if (!widgetActive) { addWidget(widgetId); onClose(); } }}
                          disabled={widgetActive}
                          style={{ padding: "2px 8px", background: widgetActive ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${widgetActive ? "var(--th-border-accent)" : "var(--th-border)"}`, borderRadius: 4, fontFamily: mono, fontSize: 10, color: widgetActive ? "var(--th-text-accent)" : "var(--th-text-secondary)", cursor: widgetActive ? "default" : "pointer", flexShrink: 0 }}>
                          {widgetActive ? "✓" : isKo ? "위젯" : "widget"}
                        </button>
                      ) : (
                        <button
                          onClick={() => { openCustomApp(f.id); onClose(); }}
                          style={{ padding: "2px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--th-border)", borderRadius: 4, fontFamily: mono, fontSize: 10, color: "var(--th-text-secondary)", cursor: "pointer", flexShrink: 0 }}>
                          {isKo ? "열기" : "open"}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCustom(f.id)}
                        style={{ padding: "2px 6px", background: "transparent", border: "1px solid var(--th-danger-border)", borderRadius: 4, fontFamily: mono, fontSize: 10, color: "var(--th-danger-text)", cursor: "pointer", flexShrink: 0 }}>
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {customFeatures.length === 0 && (
              <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", textAlign: "center", padding: "8px 0" }}>
                {isKo ? "아직 만든 기능이 없습니다" : "No custom features yet"}
              </div>
            )}
          </div>

          </div>{/* /스크롤 본문 */}
        </div>
      </div>

      <WidgetBuilderModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onCreated={handleCustomCreated}
      />
    </>
  );
}
