const STYLE = `
  @keyframes mascot-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-13px); }
  }
  @keyframes mascot-blink {
    0%, 86%, 100% { transform: scaleY(1); }
    91% { transform: scaleY(0.08); }
  }
  @keyframes mascot-glow {
    0%, 100% { opacity: 0.55; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.18); }
  }
  @keyframes mascot-shadow {
    0%, 100% { transform: scaleX(1); opacity: 0.4; }
    50% { transform: scaleX(0.72); opacity: 0.15; }
  }
  @keyframes antenna-sway {
    0%, 100% { transform: rotate(-5deg); }
    50% { transform: rotate(5deg); }
  }
  @keyframes ball-pulse {
    0%, 100% { box-shadow: 0 0 6px rgba(196,181,253,0.8), 0 0 14px rgba(139,92,246,0.5); }
    50% { box-shadow: 0 0 12px rgba(196,181,253,1), 0 0 28px rgba(139,92,246,0.9); }
  }
`;

export default function DesktopMascot() {
  return (
    <>
      <style>{STYLE}</style>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -55%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 2,
        }}
      >
        {/* 뒤 글로우 */}
        <div
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(109,40,217,0.3) 0%, transparent 70%)",
            top: 16,
            animation: "mascot-glow 3.6s ease-in-out infinite",
          }}
        />

        {/* 플로팅 래퍼 */}
        <div style={{ animation: "mascot-float 3.6s ease-in-out infinite", position: "relative" }}>

          {/* 안테나 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transformOrigin: "bottom center",
              animation: "antenna-sway 2.4s ease-in-out infinite",
              marginBottom: -1,
            }}
          >
            {/* 안테나 볼 */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 30% 30%, #ede9fe, #a78bfa)",
                animation: "ball-pulse 2.4s ease-in-out infinite",
                marginBottom: 2,
              }}
            />
            {/* 안테나 막대 */}
            <div
              style={{
                width: 3,
                height: 16,
                background:
                  "linear-gradient(180deg, #c4b5fd 0%, #7c3aed 100%)",
                borderRadius: 2,
              }}
            />
          </div>

          {/* 본체 (macOS 아이콘 스타일) */}
          <div
            style={{
              width: 116,
              height: 116,
              borderRadius: 26,
              background:
                "linear-gradient(150deg, #818cf8 0%, #7c3aed 45%, #5b21b6 100%)",
              position: "relative",
              overflow: "hidden",
              boxShadow: [
                "0 0 0 1px rgba(255,255,255,0.18) inset",
                "0 2px 0 rgba(255,255,255,0.12) inset",
                "0 28px 56px rgba(88,28,135,0.75)",
                "0 10px 20px rgba(0,0,0,0.55)",
              ].join(", "),
            }}
          >
            {/* 상단 광택 */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "46%",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.03) 100%)",
                borderRadius: "26px 26px 60% 60%",
              }}
            />

            {/* 얼굴 */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -38%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              {/* 눈 */}
              <div style={{ display: "flex", gap: 15 }}>
                {[0, 0.18].map((delay) => (
                  <div
                    key={delay}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 6px rgba(255,255,255,0.45)",
                      transformOrigin: "center",
                      animation: `mascot-blink 5s ease-in-out infinite ${delay}s`,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#2e1065",
                        transform: "translate(1px, 1px)",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* 미소 */}
              <div
                style={{
                  width: 34,
                  height: 14,
                  borderBottom: "2.5px solid rgba(255,255,255,0.9)",
                  borderRadius: "0 0 20px 20px",
                }}
              />
            </div>

            {/* 볼터치 */}
            <div
              style={{
                position: "absolute",
                top: "55%",
                left: "9%",
                width: 20,
                height: 11,
                borderRadius: "50%",
                background: "rgba(255,150,200,0.32)",
                filter: "blur(3px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "55%",
                right: "9%",
                width: 20,
                height: 11,
                borderRadius: "50%",
                background: "rgba(255,150,200,0.32)",
                filter: "blur(3px)",
              }}
            />

            {/* 하단 미러 반사 */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "18%",
                background:
                  "linear-gradient(0deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
              }}
            />
          </div>
        </div>

        {/* 바닥 그림자 */}
        <div
          style={{
            width: 68,
            height: 13,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(88,28,135,0.65) 0%, transparent 70%)",
            marginTop: 5,
            animation: "mascot-shadow 3.6s ease-in-out infinite",
          }}
        />

        {/* 라벨 */}
        <div
          style={{
            marginTop: 14,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
            fontSize: 11,
            fontWeight: 500,
            color: "rgba(255,255,255,0.42)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
          }}
        >
          AgentDesk
        </div>
      </div>
    </>
  );
}
