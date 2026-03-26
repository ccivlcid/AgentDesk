import { useState, useEffect } from "react";
import type { Agent } from "../../types";
import type { I18nContextValue } from "../../i18n";
import { useProjectStore } from "../../store/projectStore";

function IconPlay({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconFolder({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function buildRunPrompt(projectName: string, projectPath: string): string {
  return `아래 GitHub 프로젝트를 설치하고 실행해주세요.

프로젝트: ${projectName}
경로: ${projectPath}

다음 순서로 진행해주세요:
1. cd "${projectPath}" 로 이동
2. 프로젝트 타입 감지 (ls 또는 dir로 파일 목록 확인)
   - package.json → Node.js (npm install → npm start 또는 npm run dev)
   - requirements.txt / pyproject.toml → Python (pip install -r requirements.txt 또는 uv sync → python main.py)
   - Cargo.toml → Rust (cargo build → cargo run)
   - go.mod → Go (go mod tidy → go run .)
   - pom.xml → Java/Maven (mvn install → mvn exec:java)
   - build.gradle → Java/Gradle (gradle build → gradle run)
   - Makefile → make install → make run (또는 make)
3. 의존성 설치
4. 애플리케이션 실행
5. 오류 발생 시 진단 후 재시도`;
}

export function RunProjectModal({
  t,
  info,
  agents,
  onClose,
  onRun,
}: {
  t: I18nContextValue["t"];
  info: { projectId: string; projectName: string; projectPath: string };
  agents: Agent[];
  onClose: () => void;
  onRun: (agentId: string) => void;
}) {
  const mono = { fontFamily: "var(--th-font-mono)" };
  const { projectAgentIds } = useProjectStore();

  // Filter to only project-assigned agents, exclude PM, exclude working
  const projectAgents = agents.filter((a) =>
    projectAgentIds.has(a.id) && a.role !== "team_leader" && a.status !== "working"
  );
  const availableAgents = projectAgents.length > 0 ? projectAgents : agents.filter((a) => a.status !== "working");
  const [selectedAgentId, setSelectedAgentId] = useState(availableAgents[0]?.id ?? "");

  useEffect(() => {
    if (!selectedAgentId && availableAgents.length > 0) setSelectedAgentId(availableAgents[0].id);
  }, [availableAgents, selectedAgentId]);

  return (
    <div
      data-no-ctx="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3200,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(480px, 92vw)",
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid #E5E7EB",
            background: "#FFFFFF",
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={onClose}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#ff5f57",
                border: "none",
                cursor: "pointer",
              }}
            />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27c93f" }} />
          </div>
          <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "#22c55e", display: "inline-flex" }}>
            <IconPlay size={14} />
          </span>
          <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: "#111827" }}>
            {t({ ko: "앱 실행", en: "Run App", ja: "アプリ実行", zh: "运行应用" })}
          </span>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
            }}
          >
            <div
              style={{
                ...mono,
                fontSize: 13,
                fontWeight: 700,
                color: "#111827",
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ display: "inline-flex", color: "#9CA3AF" }}>
                <IconFolder size={16} />
              </span>
              {info.projectName}
            </div>
            <div style={{ ...mono, fontSize: 10, color: "#6B7280", wordBreak: "break-all" }}>
              {info.projectPath}
            </div>
          </div>

          <div style={{ ...mono, fontSize: 11, color: "#6B7280", lineHeight: 1.6 }}>
            {t({
              ko: "AI 에이전트가 프로젝트 타입을 감지하고 자동으로 의존성을 설치한 뒤 실행합니다.",
              en: "An AI agent will detect the project type, install dependencies, and run the application automatically.",
              ja: "AIエージェントがプロジェクトタイプを検出し、依存関係をインストールして実行します。",
              zh: "AI代理将检测项目类型，自动安装依赖并运行应用。",
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ ...mono, fontSize: 10, color: "#9CA3AF", letterSpacing: "0.08em" }}>
              {t({ ko: "실행할 에이전트", en: "AGENT", ja: "エージェント", zh: "代理" })}
            </div>
            {availableAgents.length === 0 ? (
              <div
                style={{
                  ...mono,
                  fontSize: 11,
                  color: "#f59e0b",
                  padding: "8px 12px",
                  background: "rgba(245,158,11,0.08)",
                  borderRadius: 6,
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                {t({
                  ko: "사용 가능한 에이전트가 없습니다 (모두 작업 중)",
                  en: "No available agents (all are working)",
                  ja: "利用可能なエージェントなし",
                  zh: "没有可用代理",
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                {availableAgents.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAgentId(a.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                      textAlign: "left",
                      border: `1px solid ${selectedAgentId === a.id ? "#22c55e" : "#E5E7EB"}`,
                      background: selectedAgentId === a.id ? "rgba(34,197,94,0.08)" : "transparent",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{a.avatar_emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: "#111827" }}>
                        {a.name}
                      </div>
                      <div style={{ ...mono, fontSize: 9, color: "#9CA3AF" }}>{a.role}</div>
                    </div>
                    {selectedAgentId === a.id && (
                      <span style={{ color: "#22c55e", fontSize: 11, display: "inline-flex" }}>
                        <IconCheck size={14} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{
                ...mono,
                fontSize: 11,
                padding: "7px 16px",
                borderRadius: 6,
                cursor: "pointer",
                border: "1px solid #E5E7EB",
                background: "transparent",
                color: "#6B7280",
              }}
            >
              {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
            </button>
            <button
              disabled={!selectedAgentId || availableAgents.length === 0}
              onClick={() => {
                if (selectedAgentId) onRun(selectedAgentId);
              }}
              style={{
                ...mono,
                fontSize: 11,
                padding: "7px 20px",
                borderRadius: 6,
                cursor: selectedAgentId ? "pointer" : "not-allowed",
                border: "1px solid #22c55e",
                background: "#22c55e",
                color: "#000",
                fontWeight: 700,
                opacity: selectedAgentId ? 1 : 0.4,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconPlay size={12} />
                {t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
