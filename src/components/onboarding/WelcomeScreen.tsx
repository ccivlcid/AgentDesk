interface WelcomeScreenProps {
  onCreateProject: () => void;
  onSkip?: () => void;
}

export default function WelcomeScreen({ onCreateProject, onSkip }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      {/* 로고 */}
      <div className="mb-5">
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
      <h1
        className="text-xl font-bold mb-3"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        AgentDesk에 오신 걸 환영해요!
      </h1>

      {/* 설명 */}
      <p className="text-sm text-[var(--th-text-muted)] max-w-sm mb-2 leading-relaxed">
        AgentDesk는 프로젝트의 목표·리스크·결과물을
        <br />
        한 곳에서 관리하는 도구입니다.
      </p>
      <p className="text-sm text-[var(--th-text-muted)] max-w-sm mb-8 leading-relaxed">
        시작하려면 첫 번째 프로젝트를 만들어보세요.
      </p>

      {/* Primary CTA */}
      <button
        onClick={onCreateProject}
        className="flex items-center gap-2 px-6 py-3 bg-[var(--th-accent)] text-white
                   text-sm font-semibold rounded hover:opacity-90 transition-opacity mb-4"
      >
        프로젝트 만들기 →
      </button>

      {/* Skip */}
      {onSkip && (
        <button
          onClick={onSkip}
          className="text-xs text-[var(--th-text-muted)] hover:text-[var(--th-text)] transition-colors underline"
        >
          나중에 만들게요 (건너뛰기)
        </button>
      )}

      {/* 하단 힌트 */}
      <div className="mt-10 grid grid-cols-3 gap-6 max-w-md text-left">
        {[
          { icon: "🎯", title: "목표 관리", desc: "프로젝트가 이루려는 것을 추적해요" },
          { icon: "⚠️", title: "리스크 관리", desc: "주의가 필요한 항목을 미리 기록해요" },
          { icon: "✅", title: "결과물 관리", desc: "만들어야 하는 것을 한눈에 봐요" },
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
