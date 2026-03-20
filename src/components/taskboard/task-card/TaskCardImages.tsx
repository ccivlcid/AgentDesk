import { getImageUrl } from "../../../api/image-studio";
import type { TaskCardState } from "./useTaskCardState";

interface TaskCardImagesProps {
  state: TaskCardState;
}

export function TaskCardImages({ state }: TaskCardImagesProps) {
  const {
    t,
    showImages,
    setShowImages,
    taskImages,
    openWindow,
  } = state;

  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--th-border)" }}>
      <button
        type="button"
        onClick={() => setShowImages((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] transition-colors"
        style={{ color: "var(--th-text-muted)" }}
      >
        <svg width="11" height="11" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="2" width="16" height="14" rx="2" />
          <circle cx="5.5" cy="7" r="1.5" />
          <polyline points="1,14 6,9 9,12 12,9 17,14" />
        </svg>
        {t({ ko: "생성 이미지", en: "Generated Images", ja: "生成画像", zh: "生成图像" })}
        {taskImages.length > 0 && (
          <span className="px-1.5 text-[10px] font-mono" style={{ borderRadius: 6, background: "rgba(236,72,153,0.15)", color: "#ec4899" }}>
            {taskImages.length}
          </span>
        )}
        <span className="ml-0.5">{showImages ? "▲" : "▼"}</span>
      </button>

      {showImages && (
        <div className="mt-2">
          {taskImages.length === 0 ? (
            <div className="flex items-center gap-2">
              <p className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "연동된 이미지 없음", en: "No images linked", ja: "画像なし", zh: "无关联图像" })}
              </p>
              <button
                type="button"
                onClick={() => openWindow("image-studio")}
                className="text-[10px] font-mono px-2 py-0.5"
                style={{ borderRadius: 6, border: "1px solid var(--th-border-accent)", color: "var(--th-accent)", background: "rgba(245,158,11,0.08)", cursor: "pointer" }}
              >
                {t({ ko: "Image Studio 열기", en: "Open Image Studio", ja: "Image Studioを開く", zh: "打开图像工作室" })}
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                {taskImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative overflow-hidden"
                    style={{ borderRadius: 6, border: "1px solid var(--th-border)", aspectRatio: "1", cursor: "pointer" }}
                    onClick={() => openWindow("image-studio")}
                    title={img.prompt}
                  >
                    <img
                      src={getImageUrl(img.id, true)}
                      alt={img.prompt}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => openWindow("image-studio")}
                className="mt-1.5 w-full text-[10px] font-mono py-1"
                style={{ borderRadius: 6, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "pointer" }}
              >
                {t({ ko: "Image Studio에서 더 보기 →", en: "View in Image Studio →", ja: "Image Studioで表示 →", zh: "在图像工作室查看 →" })}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
