const API_BASE = "http://127.0.0.1:8790";

interface Props {
  featureId: string;
}

export default function AiBundleRenderer({ featureId }: Props) {
  return (
    <iframe
      src={`${API_BASE}/api/custom-features/${featureId}/render`}
      sandbox="allow-scripts allow-same-origin"
      style={{ border: "none", width: "100%", height: "100%", display: "block" }}
      title={`custom-feature-${featureId}`}
    />
  );
}
