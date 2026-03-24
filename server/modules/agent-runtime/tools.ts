import fs from "node:fs";
import path from "node:path";
import { execSync, execFileSync } from "node:child_process";
import type { ToolDefinition, ToolCall, ToolResult } from "./types.ts";

// Tool definitions sent to the LLM
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "list_files",
    description: "List files and directories in a given path within the project.",
    input_schema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "Relative path from project root. Use '.' for root." },
        depth: { type: "string", description: "How many levels deep (1-3). Default 1." },
      },
      required: ["dir"],
    },
  },
  {
    name: "read_file",
    description: "Read the contents of a file within the project.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative file path from project root." },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file within the project.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative file path from project root." },
        content: { type: "string", description: "File content to write." },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "search_files",
    description: "Search for a pattern string across files in the project.",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Search pattern (regex supported)." },
        dir: { type: "string", description: "Relative directory to search in. Default '.'." },
        file_glob: { type: "string", description: "File glob pattern, e.g. '*.ts'. Default all files." },
      },
      required: ["pattern"],
    },
  },
  {
    name: "run_command",
    description: "Execute a shell command in the project directory. Use for build, test, lint, git status, etc. Commands run with a 30-second timeout.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "The shell command to execute (e.g. 'npm test', 'git status', 'ls -la')." },
      },
      required: ["command"],
    },
  },
];

const MAX_FILE_SIZE = 200_000; // 200KB
const MAX_LIST_ENTRIES = 200;

function resolveSafe(projectPath: string, rel: string): string {
  const resolved = path.resolve(projectPath, rel);
  if (!resolved.startsWith(path.resolve(projectPath))) {
    throw new Error("Path traversal not allowed.");
  }
  return resolved;
}

function listFiles(projectPath: string, dir: string, depth: number): string {
  const base = resolveSafe(projectPath, dir);
  const entries: string[] = [];

  function walk(current: string, currentDepth: number, prefix: string) {
    if (currentDepth > depth || entries.length >= MAX_LIST_ENTRIES) return;
    let items: string[];
    try {
      items = fs.readdirSync(current);
    } catch {
      return;
    }
    for (const item of items) {
      if (item.startsWith(".") && item !== ".env.example") continue; // skip hidden
      if (item === "node_modules" || item === "dist" || item === ".git") continue;
      const full = path.join(current, item);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      const isDir = stat.isDirectory();
      entries.push(`${prefix}${item}${isDir ? "/" : ""}`);
      if (isDir && currentDepth < depth) {
        walk(full, currentDepth + 1, prefix + "  ");
      }
    }
  }

  walk(base, 1, "");
  return entries.join("\n") || "(empty directory)";
}

function readFile(projectPath: string, filePath: string): string {
  const full = resolveSafe(projectPath, filePath);
  if (!fs.existsSync(full)) return `File not found: ${filePath}`;
  const stat = fs.statSync(full);
  if (stat.size > MAX_FILE_SIZE) {
    return `File too large (${stat.size} bytes). Max ${MAX_FILE_SIZE} bytes.`;
  }
  try {
    return fs.readFileSync(full, "utf8");
  } catch {
    return `Cannot read file: ${filePath}`;
  }
}

function writeFile(projectPath: string, filePath: string, content: string): string {
  const full = resolveSafe(projectPath, filePath);
  const dir = path.dirname(full);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  return `Written: ${filePath} (${content.length} chars)`;
}

const RUN_COMMAND_TIMEOUT = 30_000;
const MAX_OUTPUT_LENGTH = 10_000;

function runCommand(projectPath: string, command: string): string {
  if (!command.trim()) throw new Error("command is required");

  const cwd = path.resolve(projectPath);
  try {
    const result = execSync(command, {
      cwd,
      timeout: RUN_COMMAND_TIMEOUT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
      maxBuffer: 1024 * 1024, // 1MB
    });
    const output = result.trim();
    if (output.length > MAX_OUTPUT_LENGTH) {
      return output.slice(0, MAX_OUTPUT_LENGTH) + `\n... (truncated, ${output.length} chars total)`;
    }
    return output || "(no output)";
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string; killed?: boolean };
    if (e.killed) return `Command timed out after ${RUN_COMMAND_TIMEOUT / 1000}s`;
    const stdout = (e.stdout ?? "").trim();
    const stderr = (e.stderr ?? "").trim();
    const combined = [stdout, stderr].filter(Boolean).join("\n").slice(0, MAX_OUTPUT_LENGTH);
    return `Exit code ${e.status ?? 1}\n${combined || "(no output)"}`;
  }
}

function searchFiles(projectPath: string, pattern: string, dir: string, fileGlob: string): string {
  const base = resolveSafe(projectPath, dir);
  try {
    // Use execFileSync with array args to prevent shell injection
    const args = ["-r", "-n", "--max-count=20"];
    if (fileGlob) args.push(`--include=${fileGlob}`);
    args.push(pattern, base);
    const result = execFileSync("grep", args, { timeout: 10_000, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    // Make paths relative
    return result
      .split("\n")
      .map((line) => line.replace(base + path.sep, "").replace(base + "/", ""))
      .filter(Boolean)
      .slice(0, 50)
      .join("\n") || "No matches found.";
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string };
    if (e.status === 1) return "No matches found.";
    return `Search error: ${String(err)}`;
  }
}

export function executeTool(call: ToolCall, projectPath: string): ToolResult {
  try {
    let content = "";
    if (call.name === "list_files") {
      const dir = String(call.input.dir ?? ".");
      const depth = Math.min(3, Math.max(1, parseInt(String(call.input.depth ?? "1"), 10) || 1));
      content = listFiles(projectPath, dir, depth);
    } else if (call.name === "read_file") {
      const filePath = String(call.input.path ?? "");
      if (!filePath) throw new Error("path is required");
      content = readFile(projectPath, filePath);
    } else if (call.name === "write_file") {
      const filePath = String(call.input.path ?? "");
      const fileContent = String(call.input.content ?? "");
      if (!filePath) throw new Error("path is required");
      content = writeFile(projectPath, filePath, fileContent);
    } else if (call.name === "search_files") {
      const pat = String(call.input.pattern ?? "");
      const dir = String(call.input.dir ?? ".");
      const glob = String(call.input.file_glob ?? "");
      if (!pat) throw new Error("pattern is required");
      content = searchFiles(projectPath, pat, dir, glob);
    } else if (call.name === "run_command") {
      const command = String(call.input.command ?? "");
      content = runCommand(projectPath, command);
    } else {
      throw new Error(`Unknown tool: ${call.name}`);
    }
    return { tool_use_id: call.id, content, is_error: false };
  } catch (err) {
    return { tool_use_id: call.id, content: String(err), is_error: true };
  }
}
