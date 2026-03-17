/**
 * Synapse — Notion API client (v1)
 * Uses Notion Integration Token (Bearer auth)
 */

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export interface NotionPage {
  id: string;
  type: "page" | "database";
  title: string;
  url: string;
  last_edited_time: string;
}

export interface NotionWorkspaceInfo {
  workspace_name: string;
  workspace_icon: string | null;
  bot_id: string;
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

function extractTitle(obj: Record<string, unknown>): string {
  const props = (obj.properties as Record<string, unknown>) ?? {};
  for (const key of ["Name", "Title", "title"]) {
    const p = props[key] as Record<string, unknown> | undefined;
    if (!p) continue;
    const titleArr = p.title as Array<{ plain_text: string }> | undefined;
    if (titleArr?.[0]?.plain_text) return titleArr[0].plain_text;
  }
  // fallback: top-level title for database
  const tArr = (obj.title as Array<{ plain_text: string }>) ?? [];
  if (tArr[0]?.plain_text) return tArr[0].plain_text;
  return "(Untitled)";
}

export async function getNotionWorkspaceInfo(token: string): Promise<NotionWorkspaceInfo> {
  const res = await fetch(`${NOTION_API}/users/me`, { headers: headers(token) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion API error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  return {
    workspace_name: (data.workspace_name as string) ?? "Notion Workspace",
    workspace_icon: (data.workspace_icon as string) ?? null,
    bot_id: (data.bot as Record<string, unknown>)?.id as string ?? "",
  };
}

export async function searchNotionPages(token: string, query: string, limit = 20): Promise<NotionPage[]> {
  const body: Record<string, unknown> = { page_size: limit };
  if (query) body.query = query;
  const res = await fetch(`${NOTION_API}/search`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion search error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { results: Array<Record<string, unknown>> };
  return data.results.map((item) => ({
    id: item.id as string,
    type: (item.object as string) === "database" ? "database" : "page",
    title: extractTitle(item),
    url: (item.url as string) ?? "",
    last_edited_time: (item.last_edited_time as string) ?? "",
  }));
}

/**
 * Convert plain markdown text to Notion block objects (paragraph only — sufficient for deliverable export)
 */
function markdownToBlocks(text: string): unknown[] {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => ({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: line } }],
      },
    }));
}

export async function createNotionPage(
  token: string,
  parentPageId: string,
  title: string,
  content: string,
): Promise<{ id: string; url: string }> {
  const body = {
    parent: { page_id: parentPageId },
    properties: {
      title: { title: [{ type: "text", text: { content: title } }] },
    },
    children: markdownToBlocks(content),
  };
  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion create page error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { id: string; url: string };
  return { id: data.id, url: data.url };
}

export async function getNotionPageContent(token: string, pageId: string): Promise<string> {
  const res = await fetch(`${NOTION_API}/blocks/${pageId}/children?page_size=100`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`Notion blocks error ${res.status}`);
  const data = (await res.json()) as { results: Array<Record<string, unknown>> };

  const lines: string[] = [];
  for (const block of data.results) {
    const type = block.type as string;
    const content = block[type] as Record<string, unknown> | undefined;
    if (!content) continue;
    const richText = content.rich_text as Array<{ plain_text: string }> | undefined;
    if (richText) {
      lines.push(richText.map((t) => t.plain_text).join(""));
    }
  }
  return lines.join("\n");
}
