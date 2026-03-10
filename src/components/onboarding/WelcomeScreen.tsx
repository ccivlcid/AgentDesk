interface WelcomeScreenProps {
  onCreateProject: () => void;
}

export default function WelcomeScreen({ onCreateProject }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      {/* 로고 */}
      <div className="mb-6">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          stroke="var(--th-accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="6" y="20" width="36" height="20" rx="2" />
          <path d="M12 20V12a3 3 0 013-3h18a3 3 0 013 3v8" />
          <path d="M18 34v3M30 34v3M24 31v6" />
        </svg>
      </div>

      {/* 타이틀 */}
      <h1 className="text-lg font-bold mb-2">AgentDesk에 오신 걸 환영해요</h1>
      <p className="text-sm text-[var(--th-text-muted)] max-w-sm mb-8 leading-relaxed">
        AI 에이전트와 함께 프로젝트를 운영하세요.
        첫 번째 프로젝트를 만들어 대시보드를 시작해요.
      </p>

      {/* CTA */}
      <button
        onClick={onCreateProject}
        className="flex items-center gap-2 px-5 py-2.5 bg-[var(--th-accent)] text-white
                   text-sm font-medium rounded hover:opacity-90 transition-opacity"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 4v12M4 10h12" />
        </svg>
        첫 프로젝트 만들기
      </button>

      {/* 하단 힌트 */}
      <div className="mt-10 grid grid-cols-3 gap-6 max-w-md text-left">
        {[
          { icon: "🎯", title: "목표 관리", desc: "프로젝트 목표와 KPI를 추적해요" },
          { icon: "⚠️", title: "리스크 관리", desc: "위험 요소를 사전에 식별해요" },
          { icon: "✅", title: "검토 단계", desc: "게이트별 품질을 보장해요" },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xs font-semibold mb-0.5">{title}</div>
            <div className="text-[10px] text-[var(--th-text-muted)] leading-snug">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
