import { useEffect, useState } from "react";
import type { CustomFeature } from "../../../types";
import { getCustomFeature } from "../../../api/custom-features";
import CustomFeatureRenderer from "../../widget-builder/CustomFeatureRenderer";

export default function CustomFeatureWidget({ featureId }: { featureId: string }) {
  const [feature, setFeature] = useState<CustomFeature | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getCustomFeature(featureId)
      .then(setFeature)
      .catch(() => setError(true));
  }, [featureId]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full" style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
        기능을 불러올 수 없습니다
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="flex items-center justify-center h-full" style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
        <span className="animate-pulse">▌</span>
      </div>
    );
  }

  // 새로고침 주기 자동 처리
  const refreshMs: Record<string, number> = { "5s": 5000, "30s": 30000, "1m": 60000, "5m": 300000 };
  const interval = refreshMs[feature.config.refresh];

  useEffect(() => {
    if (!interval) return;
    const id = setInterval(() => getCustomFeature(featureId).then(setFeature).catch(() => {}), interval);
    return () => clearInterval(id);
  }, [featureId, interval]);

  return <CustomFeatureRenderer feature={feature} />;
}
