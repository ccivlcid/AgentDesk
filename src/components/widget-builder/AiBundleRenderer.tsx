interface Props {
  featureId: string;
}

export default function AiBundleRenderer({ featureId }: Props) {
  return (
    <iframe
      src={`/api/custom-features/${featureId}/render`}
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      style={{ border: "none", width: "100%", height: "100%", display: "block" }}
      title={`custom-feature-${featureId}`}
    />
  );
}
