/**
 * Session management — replaces useSession hook.
 * Pure class with callbacks, no React dependency.
 */
import { EventEmitter } from "events";
import { api, checkServer } from "../../lib/api.js";

export class SessionService extends EventEmitter {
  id: string | null = null;
  projectId: string | null = null;
  projectName: string | null = null;
  mode: "plan" | "build" | "yolo" = "build";
  agentCount = 0;
  needsSetup = false;

  async init(): Promise<void> {
    const serverUp = await checkServer();
    if (!serverUp) {
      this.emit("error", "Server not reachable at localhost:8790");
      return;
    }

    const session = await api.post<{ id: string }>("/api/tui/sessions", {
      mode: this.mode,
    });
    this.id = session.id;

    const agents = await api.get<{ agents: unknown[] }>("/api/agents");
    this.agentCount = agents.agents?.length ?? 0;
    this.needsSetup = this.agentCount === 0;

    this.emit("ready");
  }

  setProjectId(id: string | null): void {
    this.projectId = id;
    this.emit("projectChanged", id);
  }

  setSessionId(id: string): void {
    this.id = id;
    this.emit("sessionChanged", id);
  }

  setMode(mode: "plan" | "build" | "yolo"): void {
    this.mode = mode;
    this.emit("modeChanged", mode);
  }

  async forkSession(): Promise<string> {
    const newSession = await api.post<{ id: string }>("/api/tui/sessions", {
      mode: this.mode,
    });
    this.id = newSession.id;
    this.emit("sessionChanged", this.id);
    return this.id;
  }
}
