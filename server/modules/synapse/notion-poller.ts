/**
 * Synapse — Notion 30-second poller
 * Polls recently-edited Notion pages and fires matching rules.
 */
import type { DatabaseSync } from "node:sqlite";
import logger from "../../lib/logger.ts";
import { fireMatchingRules } from "./rule-engine.ts";

const POLL_INTERVAL_MS = 30_000;

interface NotionConnection {
  token: string;
}

function getNotionConnection(db: DatabaseSync): NotionConnection | null {
  try {
    const conn = db.prepare("SELECT config_json FROM synapse_connections WHERE platform = 'notion' AND status = 'connected'").get() as
      | { config_json: string }
      | undefined;
    if (!conn) return null;
    const cfg = JSON.parse(conn.config_json) as Record<string, unknown>;
    if (typeof cfg.token !== "string") return null;
    return { token: cfg.token };
  } catch {
    return null;
  }
}

async function pollRecentPages(
  token: string,
  since: number,
): Promise<Array<{ id: string; title: string; editedAt: number }>> {
  const sinceIso = new Date(since).toISOString();
  try {
    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: { value: "page", property: "object" },
        sort: { direction: "descending", timestamp: "last_edited_time" },
        page_size: 20,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results: Array<{
        id: string;
        last_edited_time: string;
        properties?: Record<string, unknown>;
        title?: Array<{ plain_text: string }>;
      }>;
    };
    const pages: Array<{ id: string; title: string; editedAt: number }> = [];
    for (const page of data.results) {
      const editedAt = new Date(page.last_edited_time).getTime();
      if (editedAt <= since) break; // results are sorted desc, so stop here
      // Extract title from properties
      let title = page.id;
      if (page.properties) {
        for (const val of Object.values(page.properties)) {
          const prop = val as Record<string, unknown>;
          if (prop.type === "title") {
            const titles = prop.title as Array<{ plain_text: string }> | undefined;
            if (titles && titles.length > 0) {
              title = titles.map((t) => t.plain_text).join("");
              break;
            }
          }
        }
      }
      pages.push({ id: page.id, title, editedAt });
    }
    return pages;
  } catch {
    return [];
  }
}

interface PollerHandle {
  stop: () => void;
}

export function startNotionPoller(
  db: DatabaseSync,
  broadcast: (type: string, payload: unknown) => void,
): PollerHandle {
  let lastPollAt = Date.now() - POLL_INTERVAL_MS; // prime: look back one interval on first run

  const timer = setInterval(async () => {
    const conn = getNotionConnection(db);
    if (!conn) return;

    // Check if there are any enabled notion rules
    let ruleCount = 0;
    try {
      const row = db.prepare("SELECT COUNT(*) as cnt FROM synapse_rules WHERE source = 'notion' AND enabled = 1").get() as
        | { cnt: number }
        | undefined;
      ruleCount = row?.cnt ?? 0;
    } catch {
      return;
    }
    if (ruleCount === 0) return;

    const since = lastPollAt;
    lastPollAt = Date.now();

    try {
      const pages = await pollRecentPages(conn.token, since);
      for (const page of pages) {
        fireMatchingRules(db, {
          source: "notion",
          path: page.id,
          title: page.title,
          eventType: "update",
        }, broadcast);
      }
      if (pages.length > 0) {
        logger.debug({ count: pages.length }, "[synapse-notion] polled updated pages");
      }
    } catch (err) {
      logger.warn({ err }, "[synapse-notion] poll error");
    }
  }, POLL_INTERVAL_MS);

  logger.info("[synapse-notion] poller started (30s interval)");

  return {
    stop() {
      clearInterval(timer);
      logger.info("[synapse-notion] poller stopped");
    },
  };
}
