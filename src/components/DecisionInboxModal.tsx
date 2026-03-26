import { useEffect, useMemo, useState } from "react";
import type { UiLanguage } from "../i18n";
import { pickLang } from "../i18n";
import { useToast } from "./ui/Toast";
import type { Agent } from "../types";
import AgentAvatar from "./AgentAvatar";
import MessageContent from "./MessageContent";
import type { DecisionInboxItem } from "./chat/decision-inbox";
import { formatDecisionInboxTime as formatTime, type DecisionInboxModalProps } from "./chat/decision-inbox-modal.meta";
import AppWindow from "./windows/AppWindow";
import { useUiStore } from "../store/uiStore";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

const KIND_META: Record<
  string,
  { label: { ko: string; en: string }; color: string; badge: string }
> = {
  project_review_ready: { label: { ko: "프로젝트 검토", en: "Project Review" }, color: "#818cf8", badge: "REVIEW" },
  task_review_ready:    { label: { ko: "태스크 검토",   en: "Task Review"   }, color: "#60a5fa", badge: "TASK" },
  task_timeout_resume:  { label: { ko: "타임아웃 재개", en: "Timeout Resume" }, color: "#fb923c", badge: "TIMEOUT" },
  review_round_pick:    { label: { ko: "리뷰 라운드",   en: "Review Round"  }, color: "#34d399", badge: "ROUND" },
};
const defaultKind = { label: { ko: "에이전트 요청", en: "Agent Request" }, color: "#94a3b8", badge: "REQUEST" };

// SVG icon for the window title
const DecisionIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 9h6M9 12h6M9 15h4" />
  </svg>
);

// SVG fallback for missing agent avatar
const AgentIconSvg = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M9 11V7a3 3 0 0 1 6 0v4" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export default function DecisionInboxModal({
  loading,
  items,
  agents,
  busyKey,
  uiLanguage,
  onClose,
  onRefresh,
  onReplyOption,
  onOpenChat,
}: DecisionInboxModalProps) {
  const t = (text: { ko: string; en: string; ja?: string; zh?: string }) => pickLang(uiLanguage, text);
  const { showToast } = useToast();
  const isKorean = uiLanguage.startsWith("ko");
  const { settings } = useUiStore();
  const isYoloMode = settings.yoloMode === true;
  const agentById = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const agent of agents) map.set(agent.id, agent);
    return map;
  }, [agents]);

  const [followupTarget, setFollowupTarget] = useState<{ itemId: string; optionNumber: number } | null>(null);
  const [followupDraft, setFollowupDraft] = useState("");
  const [reviewPickSelections, setReviewPickSelections] = useState<Record<string, number[]>>({});
  const [reviewPickDrafts, setReviewPickDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!followupTarget) return;
    const stillExists = items.some((entry) => entry.id === followupTarget.itemId);
    if (!stillExists) { setFollowupTarget(null); setFollowupDraft(""); }
  }, [followupTarget, items]);

  useEffect(() => {
    setReviewPickSelections((prev) => {
      const keep = new Set(items.map((item) => item.id));
      const next: Record<string, number[]> = {};
      let changed = false;
      for (const [itemId, nums] of Object.entries(prev)) {
        if (!keep.has(itemId)) { changed = true; continue; }
        next[itemId] = nums;
      }
      return changed ? next : prev;
    });
    setReviewPickDrafts((prev) => {
      const keep = new Set(items.map((item) => item.id));
      const next: Record<string, string> = {};
      let changed = false;
      for (const [itemId, draft] of Object.entries(prev)) {
        if (!keep.has(itemId)) { changed = true; continue; }
        next[itemId] = draft;
      }
      return changed ? next : prev;
    });
  }, [items]);

  const followupItem = useMemo(
    () => (followupTarget ? (items.find((entry) => entry.id === followupTarget.itemId) ?? null) : null),
    [followupTarget, items],
  );
  const followupBusyKey = followupTarget ? `${followupTarget.itemId}:${followupTarget.optionNumber}` : null;
  const isFollowupSubmitting = followupBusyKey ? busyKey === followupBusyKey : false;
  const canSubmitFollowup = !!(followupItem && followupDraft.trim() && !isFollowupSubmitting);

  function handleOptionClick(item: DecisionInboxItem, optionNumber: number, action?: string) {
    if (action === "add_followup_request") {
      setFollowupTarget({ itemId: item.id, optionNumber });
      setFollowupDraft("");
      return;
    }
    onReplyOption(item, optionNumber);
  }

  function handleSubmitFollowup() {
    if (!followupItem || !followupTarget) return;
    const note = followupDraft.trim();
    if (!note) return;
    onReplyOption(followupItem, followupTarget.optionNumber, { note });
    setFollowupTarget(null);
    setFollowupDraft("");
  }

  function handleCancelFollowup() {
    setFollowupTarget(null);
    setFollowupDraft("");
  }

  function getReviewPickOptions(item: DecisionInboxItem) {
    return item.options.filter((option) => option.action === "apply_review_pick");
  }

  function getReviewSkipOption(item: DecisionInboxItem) {
    return item.options.find((option) => option.action === "skip_to_next_round");
  }

  function toggleReviewPick(itemId: string, optionNumber: number) {
    setReviewPickSelections((prev) => {
      const current = prev[itemId] ?? [];
      const exists = current.includes(optionNumber);
      return { ...prev, [itemId]: exists ? current.filter((n) => n !== optionNumber) : [...current, optionNumber].sort((a, b) => a - b) };
    });
  }

  function setReviewDraft(itemId: string, value: string) {
    setReviewPickDrafts((prev) => ({ ...prev, [itemId]: value }));
  }

  function clearReviewInput(itemId: string) {
    setReviewPickSelections((prev) => { const next = { ...prev }; delete next[itemId]; return next; });
    setReviewPickDrafts((prev) => { const next = { ...prev }; delete next[itemId]; return next; });
  }

  function handleSubmitReviewPick(item: DecisionInboxItem) {
    const pickOptions = getReviewPickOptions(item);
    const selected = reviewPickSelections[item.id] ?? [];
    const extraNote = (reviewPickDrafts[item.id] ?? "").trim();
    const optionNumber = selected[0] ?? pickOptions[0]?.number;
    if (!optionNumber) return;
    if (selected.length <= 0 && !extraNote) {
      showToast(t({ ko: "옵션을 선택하거나 추가 의견을 입력하세요", en: "Pick at least one option or enter an extra note", ja: "オプションを選択するか、補足コメントを入力してください", zh: "请选择至少一个选项或输入备注" }), "warning");
      return;
    }
    onReplyOption(item, optionNumber, { selected_option_numbers: selected, ...(extraNote ? { note: extraNote } : {}) });
    clearReviewInput(item.id);
  }

  function handleSkipReviewRound(item: DecisionInboxItem) {
    const skipOption = getReviewSkipOption(item);
    if (!skipOption) return;
    clearReviewInput(item.id);
    onReplyOption(item, skipOption.number);
  }

  return (
    <AppWindow
      windowType="decision-inbox"
      title={t({ ko: "의사결정", en: "Decision Inbox", ja: "意思決定", zh: "决策收件箱" })}
      emoji={DecisionIcon}
      defaultWidth={640}
      defaultHeight={560}
      onClose={onClose}
      headerActions={
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            style={{
              ...mono,
              fontSize: "10px",
              fontWeight: 600,
              padding: "3px 8px",
              border: "1px solid #E5E7EB",
              background: "transparent",
              color: "#9CA3AF",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
            className="hover:!text-[#111827] hover:!border-[#D1D5DB]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>{" "}{t({ ko: "새로고침", en: "REFRESH", ja: "更新", zh: "刷新" })}
          </button>
          <span
            style={{
              ...mono,
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              border: "1px solid #E5E7EB",
              background: items.length > 0 ? "#EBF5FF" : "#F9FAFB",
              color: items.length > 0 ? "#3B82F6" : "#9CA3AF",
            }}
          >
            {items.length}
          </span>
        </>
      }
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* ── 목록 ── */}
        <div className="flex-1 overflow-y-auto">
          {isYoloMode ? (
            <div className="px-5 py-10 text-center">
              <div className="flex justify-center mb-3" style={{ opacity: 0.25 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <p style={{ ...mono, fontSize: "12px", fontWeight: 700, color: "#3B82F6", marginBottom: 6 }}>
                {t({
                  ko: "자율 모드",
                  en: "Autonomous Mode",
                  ja: "自律モード",
                  zh: "自主模式",
                })}
              </p>
              <p style={{ ...mono, fontSize: "11px", color: "#9CA3AF", lineHeight: 1.6 }}>
                {t({
                  ko: "PM 오케스트레이터가 자동으로 처리합니다",
                  en: "PM orchestrator handles all decisions automatically",
                  ja: "PMオーケストレーターが自動処理します",
                  zh: "PM编排器自动处理所有决策",
                })}
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 px-5 py-8" style={{ ...mono, fontSize: "12px", color: "#9CA3AF" }}>
              <span className="animate-pulse">▌</span>
              {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="flex justify-center mb-2" style={{ opacity: 0.2 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ ...mono, fontSize: "11px", color: "#9CA3AF", marginTop: 4 }}>
                {t({ ko: "미결 의사결정 없음", en: "No pending decisions", ja: "未決の意思決定なし", zh: "无待处理决策" })}
              </p>
            </div>
          ) : (
            <div>
              {items.map((item, idx) => {
                const agent = item.agentId ? agentById.get(item.agentId) : undefined;
                const agentName = isKorean ? item.agentNameKo : item.agentName;
                const meta = KIND_META[item.kind] ?? defaultKind;
                const kindLabel = isKorean ? meta.label.ko : meta.label.en;
                const isItemBusy = Boolean(busyKey?.startsWith(`${item.id}:`));

                return (
                  <div
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #E5E7EB",
                      background: idx % 2 === 0 ? "transparent" : "#F9FAFB",
                    }}
                  >
                    {/* 에이전트 행 */}
                    <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* 순번 */}
                        <span style={{ ...mono, fontSize: "10px", color: "#9CA3AF", flexShrink: 0, opacity: 0.5 }}>
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        {/* 아바타 */}
                        {agent ? (
                          <AgentAvatar agent={agent} size={28} />
                        ) : (
                          <span
                            className="flex items-center justify-center"
                            style={{ width: 28, height: 28, background: "#FFFFFF", border: "1px solid #E5E7EB", flexShrink: 0, color: "#9CA3AF" }}
                          >
                            {AgentIconSvg}
                          </span>
                        )}
                        {/* 이름 + 타입 */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span style={{ ...mono, fontSize: "12px", fontWeight: 700, color: "#111827" }}>
                              {agentName}
                            </span>
                            <span
                              style={{
                                ...mono, fontSize: "8px", fontWeight: 700,
                                padding: "1px 5px",
                                border: `1px solid ${meta.color}40`,
                                background: `${meta.color}12`,
                                color: meta.color,
                                letterSpacing: "0.08em",
                              }}
                            >
                              {meta.badge}
                            </span>
                            <span style={{ ...mono, fontSize: "9px", color: "#9CA3AF" }}>
                              {kindLabel}
                            </span>
                          </div>
                          <span style={{ ...mono, fontSize: "9px", color: "#9CA3AF", opacity: 0.6 }}>
                            {formatTime(item.createdAt, uiLanguage)}
                          </span>
                        </div>
                      </div>
                      {item.agentId && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => onOpenChat(item.agentId!)}
                            style={{
                              ...mono, fontSize: "9px", fontWeight: 700,
                              padding: "2px 8px",
                              border: "1px solid #E5E7EB",
                              background: "transparent",
                              color: "#9CA3AF",
                              cursor: "pointer",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {t({ ko: "채팅", en: "CHAT", ja: "チャット", zh: "聊天" })}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 메시지 내용 */}
                    <div
                      className="mx-5 mb-2 px-3 py-2.5"
                      style={{
                        border: "1px solid #E5E7EB",
                        borderLeft: `2px solid ${meta.color}60`,
                        background: "#FFFFFF",
                        ...mono, fontSize: "11px", color: "#111827",
                      }}
                    >
                      <MessageContent content={item.requestContent} />
                    </div>

                    {/* 선택지 */}
                    <div className="px-5 pb-3">
                      {item.kind === "review_round_pick" ? (
                        (() => {
                          if (item.options.length === 0) {
                            return (
                              <p style={{ ...mono, fontSize: "10px", color: "#9CA3AF", padding: "6px 0" }}>
                                · {t({ ko: "PM 의견 취합중...", en: "Planning lead is consolidating opinions...", ja: "企画リードが意見集約中...", zh: "规划负责人汇总意见中..." })}
                              </p>
                            );
                          }
                          const pickOptions = getReviewPickOptions(item);
                          const skipOption = getReviewSkipOption(item);
                          const selected = reviewPickSelections[item.id] ?? [];
                          const draft = reviewPickDrafts[item.id] ?? "";
                          return (
                            <div className="space-y-1.5">
                              {pickOptions.map((option) => {
                                const isSelected = selected.includes(option.number);
                                return (
                                  <button
                                    key={`${item.id}:${option.number}`}
                                    type="button"
                                    onClick={() => toggleReviewPick(item.id, option.number)}
                                    disabled={isItemBusy}
                                    className="w-full text-left transition"
                                    style={{
                                      ...mono, fontSize: "11px",
                                      padding: "6px 10px",
                                      border: isSelected ? "1px solid #3B82F6" : "1px solid #E5E7EB",
                                      background: isSelected ? "#F9FAFB" : "#FFFFFF",
                                      color: isSelected ? "#3B82F6" : "#6B7280",
                                      cursor: isItemBusy ? "not-allowed" : "pointer",
                                      opacity: isItemBusy ? 0.6 : 1,
                                      display: "flex", alignItems: "center", gap: 8,
                                    }}
                                  >
                                    <span style={{ fontSize: "9px", opacity: 0.6, flexShrink: 0 }}>
                                      {isSelected ? "■" : "□"}
                                    </span>
                                    {`${option.number}. ${option.label}`}
                                  </button>
                                );
                              })}
                              <p style={{ ...mono, fontSize: "9px", color: "#9CA3AF" }}>
                                {isKorean ? `${selected.length}건 선택됨` : `${selected.length} selected`}
                              </p>
                              <textarea
                                value={draft}
                                onChange={(e) => setReviewDraft(item.id, e.target.value)}
                                rows={2}
                                placeholder={t({ ko: "추가 의견 (선택)", en: "Extra notes (optional)", ja: "追加意見（任意）", zh: "补充意见（可选）" })}
                                className="w-full resize-y outline-none"
                                style={{ ...mono, fontSize: "11px", padding: "6px 10px", border: "1px solid #E5E7EB", background: "#FFFFFF", color: "#111827" }}
                              />
                              <div className="flex items-center justify-end gap-2 pt-1">
                                {skipOption && (
                                  <button
                                    type="button"
                                    onClick={() => handleSkipReviewRound(item)}
                                    disabled={isItemBusy}
                                    className="decision-round-skip transition"
                                    style={{ ...mono, fontSize: "10px", padding: "4px 10px", cursor: isItemBusy ? "not-allowed" : "pointer", opacity: isItemBusy ? 0.6 : 1 }}
                                  >
                                    {isItemBusy ? "…" : `${skipOption.number}. ${skipOption.label}`}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleSubmitReviewPick(item)}
                                  disabled={isItemBusy}
                                  className="decision-round-submit transition"
                                  style={{ ...mono, fontSize: "10px", fontWeight: 700, padding: "4px 14px", cursor: isItemBusy ? "not-allowed" : "pointer", opacity: isItemBusy ? 0.6 : 1 }}
                                >
                                  {isItemBusy
                                    ? t({ ko: "전송 중...", en: "Sending...", ja: "送信中...", zh: "发送中..." })
                                    : t({ ko: "선택 항목 진행", en: "Run Selected", ja: "選択で進行", zh: "执行所选" })}
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : item.options.length > 0 ? (
                        <div className="space-y-1.5">
                          {item.options.map((option, oIdx) => {
                            const key = `${item.id}:${option.number}`;
                            const isBusy = busyKey === key;
                            const isPrimary = oIdx === 0;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => handleOptionClick(item, option.number, option.action)}
                                disabled={isBusy}
                                className="w-full text-left transition"
                                style={{
                                  ...mono, fontSize: "11px",
                                  padding: "7px 10px",
                                  border: isPrimary ? "1px solid #3B82F6" : "1px solid #E5E7EB",
                                  background: isPrimary ? "#F9FAFB" : "#FFFFFF",
                                  color: isPrimary ? "#3B82F6" : "#6B7280",
                                  cursor: isBusy ? "not-allowed" : "pointer",
                                  opacity: isBusy ? 0.6 : 1,
                                  display: "flex", alignItems: "center", gap: 8,
                                }}
                              >
                                <span style={{ fontSize: "8px", opacity: 0.5, flexShrink: 0, display: "inline-flex", color: "inherit" }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                </span>
                                {isBusy
                                  ? t({ ko: "전송 중...", en: "Sending...", ja: "送信中...", zh: "发送中..." })
                                  : `${option.number}. ${option.label}`}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p style={{ ...mono, fontSize: "10px", color: "#9CA3AF", padding: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
                          <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 opacity-60" aria-hidden>
                            <circle cx="12" cy="12" r="2" />
                          </svg>
                          <span>
                            {item.kind === "project_review_ready"
                              ? t({ ko: "PM 의견 취합중...", en: "Planning lead is consolidating...", ja: "企画リードが集約中...", zh: "规划负责人汇总中..." })
                              : t({ ko: "선택지 준비 중...", en: "Options being prepared...", ja: "選択肢準備中...", zh: "正在准备选项..." })}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── followup 입력 ── */}
        {followupItem && (
          <div
            className="px-5 py-3 flex-shrink-0"
            style={{ borderTop: "1px solid #E5E7EB", background: "#FFFFFF" }}
          >
            <p style={{ ...mono, fontSize: "10px", fontWeight: 700, color: "#3B82F6", marginBottom: 8, letterSpacing: "0.06em" }}>
              + {t({ ko: "추가 요청사항", en: "FOLLOW-UP REQUEST", ja: "追加要請", zh: "追加请求" })}
            </p>
            <textarea
              value={followupDraft}
              onChange={(e) => setFollowupDraft(e.target.value)}
              placeholder={t({ ko: "요청사항을 입력해 주세요.", en: "Enter your request details.", ja: "要請内容を入力してください。", zh: "请输入请求详情。" })}
              rows={3}
              className="w-full resize-y outline-none"
              style={{ ...mono, fontSize: "11px", padding: "8px 10px", border: "1px solid #E5E7EB", background: "#F9FAFB", color: "#111827" }}
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelFollowup}
                disabled={isFollowupSubmitting}
                style={{
                  ...mono, fontSize: "10px", padding: "4px 10px",
                  border: "1px solid #E5E7EB",
                  background: "transparent",
                  color: "#9CA3AF",
                  cursor: isFollowupSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
              </button>
              <button
                type="button"
                onClick={handleSubmitFollowup}
                disabled={!canSubmitFollowup}
                className="decision-followup-submit"
                style={{
                  ...mono, fontSize: "10px", fontWeight: 700, padding: "4px 14px",
                  cursor: !canSubmitFollowup ? "not-allowed" : "pointer",
                  opacity: !canSubmitFollowup ? 0.5 : 1,
                }}
              >
                {isFollowupSubmitting
                  ? t({ ko: "전송 중...", en: "Sending...", ja: "送信中...", zh: "发送中..." })
                  : t({ ko: "요청 등록", en: "Submit", ja: "要請登録", zh: "提交" })}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppWindow>
  );
}
