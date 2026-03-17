/**
 * Synapse — Obsidian vault file watcher (fs.watch)
 * Watches the connected local vault for .md file changes and fires matching rules.
 */
import fs from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import logger from "../../lib/logger.ts";
import { fireMatchingRules } from "./rule-engine.ts";

interface WatcherHandle {
  stop: () => void;
}

function getVaultPath(db: DatabaseSync): string | null {
  try {
    const conn = db.prepare("SELECT config_json FROM synapse_connections WHERE platform = 'obsidian' AND status = 'connected'").get() as
      | { config_json: string }
      | undefined;
    if (!conn) return null;
    const cfg = JSON.parse(conn.config_json) as Record<string, unknown>;
    if (cfg.mode !== "local" || typeof cfg.vault_path !== "string") return null;
    return cfg.vault_path;
  } catch {
    return null;
  }
}

export function startObsidianWatcher(
  db: DatabaseSync,
  broadcast: (type: string, payload: unknown) => void,
): WatcherHandle {
  let watcher: fs.FSWatcher | null = null;

  function startWatching(vaultPath: string): void {
    if (watcher) return; // already watching
    if (!fs.existsSync(vaultPath)) {
      logger.warn({ vaultPath }, "[synapse-obsidian] vault path not found, watcher not started");
      return;
    }

    try {
      watcher = fs.watch(vaultPath, { recursive: true }, (eventType, filename) => {
        if (!filename || !filename.endsWith(".md")) return;
        // Debounce: ignore rapid successive events for same file
        const normalizedPath = filename.replace(/\\/g, "/");
        fireMatchingRules(db, {
          source: "obsidian",
          path: normalizedPath,
          title: normalizedPath.split("/").pop()?.replace(/\.md$/, "") ?? normalizedPath,
          eventType: eventType === "rename" ? "add" : "change",
        }, broadcast);
      });

      watcher.on("error", (err) => {
        logger.warn({ err }, "[synapse-obsidian] watcher error");
        watcher = null;
      });

      logger.info({ vaultPath }, "[synapse-obsidian] vault watcher started");
    } catch (err) {
      logger.warn({ err }, "[synapse-obsidian] failed to start watcher");
    }
  }

  // Try to start immediately, then re-check every 5 minutes for new connections
  const vaultPath = getVaultPath(db);
  if (vaultPath) startWatching(vaultPath);

  const recheckTimer = setInterval(() => {
    if (watcher) return; // already watching
    const path = getVaultPath(db);
    if (path) startWatching(path);
  }, 5 * 60_000);

  return {
    stop() {
      clearInterval(recheckTimer);
      if (watcher) {
        watcher.close();
        watcher = null;
        logger.info("[synapse-obsidian] vault watcher stopped");
      }
    },
  };
}
