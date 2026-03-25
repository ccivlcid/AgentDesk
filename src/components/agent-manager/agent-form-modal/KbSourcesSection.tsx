/**
 * KbSourcesSection — previously connected Notion/Obsidian KB sources via Synapse.
 * Synapse has been removed. This is a no-op stub preserving the interface
 * so that AgentFormModalPersonaBlock compiles without changes.
 */

/** Minimal stub type — replaces the deleted api/synapse KbSourceRef */
export interface KbSourceRef {
  type: "notion_page" | "obsidian_file";
  id: string;
  label?: string;
}

export function KbSourcesSection(_props: {
  sources: KbSourceRef[];
  onChange: (sources: KbSourceRef[]) => void;
  tr: (ko: string, en: string) => string;
}) {
  // Synapse removed — render nothing
  return null;
}
