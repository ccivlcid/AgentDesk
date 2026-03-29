import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AppWindow from "../windows/AppWindow";
import type { Department } from "../../types";
import { useI18n } from "../../i18n";
import { useToast } from "../ui";
import * as api from "../../api";
import { DEPT_BLANK, DEPT_COLORS } from "./constants";
import EmojiPicker from "./EmojiPicker";
import type { DeptForm, Translator } from "./types";

export default function DepartmentFormModal({
  locale: _locale,
  tr,
  department,
  departments,
  onSave,
  onClose,
  onSaveDepartment,
  onDeleteDepartment,
}: {
  locale: string;
  tr: Translator;
  department: Department | null;
  departments: Department[];
  onSave: () => void;
  onClose: () => void;
  onSaveDepartment?: (input: {
    mode: "create" | "update";
    id: string;
    payload: {
      name: string;
      name_ko: string;
      name_ja: string | null;
      name_zh: string | null;
      icon: string;
      color: string;
      description: string | null;
      prompt: string | null;
      sort_order: number;
    };
  }) => Promise<void>;
  onDeleteDepartment?: (departmentId: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const isEdit = !!department;
  const [form, setForm] = useState<DeptForm>(() => {
    if (department) {
      return {
        id: department.id,
        name: department.name,
        icon: department.icon,
        color: department.color,
        description: department.description || "",
        prompt: department.prompt || "",
      };
    }
    return { ...DEPT_BLANK };
  });
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // sort_order 기반 다음 순번 계산
  const nextSortOrder = (() => {
    const orders = departments.map((d) => d.sort_order).filter((n) => typeof n === "number" && !isNaN(n));
    return Math.max(0, ...orders) + 1;
  })();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        name_ko: form.name.trim(),
        name_ja: form.name.trim() || null,
        name_zh: form.name.trim() || null,
        icon: form.icon,
        color: form.color,
        description: form.description.trim() || null,
        prompt: form.prompt.trim() || null,
        sort_order: department?.sort_order ?? nextSortOrder,
      };
      if (isEdit) {
        if (onSaveDepartment) {
          await onSaveDepartment({
            mode: "update",
            id: department!.id,
            payload: { ...payload, sort_order: department!.sort_order },
          });
        } else {
          await api.updateDepartment(department!.id, {
            name: payload.name,
            name_ko: payload.name_ko,
            name_ja: payload.name_ja,
            name_zh: payload.name_zh,
            icon: payload.icon,
            color: payload.color,
            description: payload.description,
            prompt: payload.prompt,
          });
        }
      } else {
        // name 기반 slug 생성, 비라틴 문자만인 경우 dept-N fallback
        const slug = form.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        let deptId = slug || `dept-${nextSortOrder}`;
        // 기존 ID와 충돌 시 숫자 접미사 추가
        const existingIds = new Set(departments.map((d) => d.id));
        let suffix = 2;
        while (existingIds.has(deptId)) {
          deptId = `${slug || "dept"}-${suffix++}`;
        }
        if (onSaveDepartment) {
          await onSaveDepartment({
            mode: "create",
            id: deptId,
            payload: { ...payload, sort_order: nextSortOrder },
          });
        } else {
          await api.createDepartment({
            id: deptId,
            name: payload.name,
            name_ko: payload.name_ko,
            name_ja: payload.name_ja ?? "",
            name_zh: payload.name_zh ?? "",
            icon: payload.icon,
            color: payload.color,
            description: payload.description ?? undefined,
            prompt: payload.prompt ?? undefined,
          });
        }
      }
      onSave();
      onClose();
    } catch (e: unknown) {
      if (api.isApiRequestError(e) && e.code === "department_id_exists") {
        showToast(t({ ko: "이미 존재하는 전문 분야 ID입니다.", en: "Specialty ID already exists.", ja: "専門分野IDが既に存在します。", zh: "专业领域ID已存在。" }), "error");
      } else if (api.isApiRequestError(e) && e.code === "sort_order_conflict") {
        showToast(
          t({
            ko: "전문 분야 정렬 순서가 충돌합니다. 잠시 후 다시 시도해주세요.",
            en: "Specialty sort order conflict. Please retry.",
            ja: "専門分野の並び順が競合しています。再試行してください。",
            zh: "专业领域排序冲突，请重试。",
          }),
          "error",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      if (onDeleteDepartment) {
        await onDeleteDepartment(department!.id);
      } else {
        await api.deleteDepartment(department!.id);
      }
      onSave();
      onClose();
    } catch (e: unknown) {
      if (api.isApiRequestError(e) && e.code === "department_has_agents") {
        showToast(t({ ko: "소속 직원이 있어 삭제할 수 없습니다.", en: "Cannot delete: specialty has agents.", ja: "所属エージェントがあるため削除できません。", zh: "无法删除：专业领域有代理。" }), "error");
      } else if (api.isApiRequestError(e) && e.code === "department_has_tasks") {
        showToast(t({ ko: "연결된 업무(Task)가 있어 삭제할 수 없습니다.", en: "Cannot delete: specialty has tasks.", ja: "関連タスクがあるため削除できません。", zh: "无法删除：专业领域有任务。" }), "error");
      } else if (api.isApiRequestError(e) && e.code === "department_protected") {
        showToast(t({ ko: "기본 시스템 전문 분야는 삭제할 수 없습니다.", en: "Cannot delete: protected system specialty.", ja: "保護されたシステム専門分野は削除できません。", zh: "无法删除：受保护的系统专业领域。" }), "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 border text-sm focus:outline-none transition-colors";
  const inputStyle = {
    background: "var(--th-bg-elevated)",
    borderColor: "var(--th-border)",
    color: "var(--th-text-primary)",
  };

  const sectionLabelStyle = {
    fontFamily: "var(--th-font-mono)" as const,
    fontSize: "9px",
    fontWeight: 700 as const,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "var(--th-text-muted)",
  };

  const title = isEdit
    ? t({ ko: "전문 분야 설정", en: "Specialty Settings", ja: "専門分野設定", zh: "专业领域设置" })
    : t({ ko: "전문 분야 등록", en: "Register Specialty", ja: "専門分野登録", zh: "注册专业领域" });

  return createPortal(
    <AppWindow
      windowType="create-department"
      title={title}
      emoji={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>}
      defaultWidth={520}
      defaultHeight={640}
      defaultX={Math.max(0, Math.round((window.innerWidth - 520) / 2))}
      defaultY={Math.max(44, Math.round((window.innerHeight - 640) / 2))}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ fontFamily: "var(--th-font-mono)" }}>

          {/* ── IDENTITY ── */}
          <div>
            <div className="mb-3 pb-1" style={{ borderBottom: "1px solid var(--th-border)" }}>
              <span style={sectionLabelStyle}>
                {t({ ko: "전문 분야 정보", en: "IDENTITY", ja: "専門分野情報", zh: "专业领域信息" })}
              </span>
            </div>

            {/* Icon + Name */}
            <div className="flex items-start gap-3 mb-3">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {t({ ko: "아이콘", en: "Icon", ja: "アイコン", zh: "图标" })}
                </label>
                <EmojiPicker value={form.icon} onChange={(emoji) => setForm({ ...form, icon: emoji })} />
              </div>
              <div className="flex-1">
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {t({ ko: "이름", en: "Name", ja: "名前", zh: "名称" })} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Development"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Theme color */}
            <div className="mb-3">
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                {t({ ko: "테마 색상", en: "Theme Color", ja: "テーマカラー", zh: "主题色" })}
              </label>
              <div className="flex gap-2">
                {DEPT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className="w-7 h-7 transition-all hover:scale-110"
                    style={{
                      borderRadius: "50%",
                      background: c,
                      outline: form.color === c ? `2px solid ${c}` : "2px solid transparent",
                      outlineOffset: "3px",
                    }}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* ── MISSION & INSTRUCTIONS ── */}
          <div>
            <div className="mb-3 pb-1" style={{ borderBottom: "1px solid var(--th-border)" }}>
              <span style={sectionLabelStyle}>
                {t({ ko: "미션 & 지시", en: "MISSION & INSTRUCTIONS", ja: "ミッション＆指示", zh: "使命与指示" })}
              </span>
            </div>

            {/* Department mission (description) */}
            <div className="mb-4">
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                {t({ ko: "전문 분야 미션", en: "Specialty Mission", ja: "専門分野ミッション", zh: "专业领域使命" })}
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t({
                  ko: "이 전문 분야가 담당하는 영역과 목표",
                  en: "What this specialty area covers and its goals",
                  ja: "この専門分野が担当する領域と目標",
                  zh: "该专业领域的覆盖范围和目标",
                })}
                className={inputCls}
                style={inputStyle}
              />
              <p className="text-[10px] mt-1" style={{ color: "var(--th-text-muted)" }}>
                {t({
                  ko: "PM이 태스크 배정 시 전문 분야 미션을 참고합니다",
                  en: "PM references this when assigning tasks to agents",
                  ja: "PMがタスク割り当て時に専門分野ミッションを参照します",
                  zh: "PM在分配任务时参考专业领域使命",
                })}
              </p>
            </div>

            {/* Department prompt */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                {t({ ko: "기본 지시사항", en: "Default Instructions", ja: "デフォルト指示", zh: "默认指示" })}
              </label>
              <textarea
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                rows={4}
                placeholder={t({
                  ko: "이 전문 분야 에이전트에게 적용되는 기본 지시사항...",
                  en: "Default instructions applied to agents in this specialty...",
                  ja: "この専門分野のエージェントに適用されるデフォルト指示...",
                  zh: "应用于该专业领域代理的默认指示...",
                })}
                className={`${inputCls} resize-none`}
                style={inputStyle}
              />
              <p className="text-[10px] mt-1" style={{ color: "var(--th-text-muted)" }}>
                {t({
                  ko: "소속 에이전트의 작업 실행 시 공통으로 적용되는 시스템 프롬프트",
                  en: "Applied as shared system prompt when agents in this specialty execute tasks",
                  ja: "この専門分野のエージェントがタスク実行時に共通適用されるシステムプロンプト",
                  zh: "该专业领域代理执行任务时共同适用的系统提示",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2 px-6 py-4" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-medium font-mono transition-all disabled:opacity-40"
            style={{ borderRadius: 10, background: "var(--th-accent)", color: "white" }}
          >
            {saving
              ? t({ ko: "처리 중...", en: "Saving...", ja: "処理中...", zh: "处理中..." })
              : isEdit
                ? t({ ko: "변경사항 저장", en: "Save Changes", ja: "変更を保存", zh: "保存更改" })
                : t({ ko: "전문 분야 등록", en: "Register Specialty", ja: "専門分野登録", zh: "注册专业领域" })}
          </button>
          {isEdit &&
            (confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-3 py-2.5 text-xs font-medium font-mono disabled:opacity-40 transition-colors"
                  style={{ borderRadius: 8, background: "rgba(244,63,94,0.15)", color: "rgb(253,164,175)", border: "1px solid rgba(244,63,94,0.35)" }}
                >
                  {t({ ko: "삭제 확인", en: "Confirm", ja: "削除確認", zh: "确认删除" })}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-2.5 text-xs font-mono transition-colors"
                  style={{ borderRadius: 8, color: "var(--th-text-muted)" }}
                >
                  {t({ ko: "취소", en: "No", ja: "いいえ", zh: "取消" })}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-2.5 text-sm font-medium font-mono transition-all"
                style={{ borderRadius: 8, border: "1px solid rgba(244,63,94,0.3)", color: "rgb(253,164,175)" }}
              >
                {t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
              </button>
            ))}
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium font-mono transition-all hover:bg-gray-100"
            style={{ borderRadius: 10, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
        </div>
      </div>
    </AppWindow>,
    document.body,
  );
}
