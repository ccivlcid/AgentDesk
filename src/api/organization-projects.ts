import { bootstrapSession, del, patch, post, put, request } from "./core";

import type {
  Agent,
  Department,
  MeetingPresence,
  Project,
  SubTask,
  Task,
  TaskExecutionEvent,
  TaskExecutionSummary,
  TaskLog,
  TaskStatus,
  TaskType,
  WorkflowPackKey,
} from "../types";

// Departments
export async function getDepartments(options?: {
  workflowPackKey?: WorkflowPackKey;
  includeSeed?: boolean;
}): Promise<Department[]> {
  const params = new URLSearchParams();
  if (options?.workflowPackKey) params.set("workflow_pack_key", options.workflowPackKey);
  if (options?.includeSeed) params.set("include_seed", "1");
  const query = params.toString();
  const j = await request<{ departments: Department[] }>(`/api/departments${query ? `?${query}` : ""}`);
  return j.departments;
}

export async function getDepartment(
  id: string,
  options?: { workflowPackKey?: WorkflowPackKey; includeSeed?: boolean },
): Promise<{ department: Department; agents: Agent[] }> {
  const params = new URLSearchParams();
  if (options?.workflowPackKey) params.set("workflow_pack_key", options.workflowPackKey);
  if (options?.includeSeed) params.set("include_seed", "1");
  const query = params.toString();
  return request(`/api/departments/${id}${query ? `?${query}` : ""}`);
}

export async function createDepartment(data: {
  id: string;
  name: string;
  name_ko?: string;
  name_ja?: string;
  name_zh?: string;
  icon?: string;
  color?: string;
  description?: string;
  prompt?: string;
  workflow_pack_key?: WorkflowPackKey;
}): Promise<Department> {
  const j = await request<{ department: Department }>("/api/departments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return j.department;
}

export async function updateDepartment(
  id: string,
  data: Partial<
    Pick<
      Department,
      "name" | "name_ko" | "name_ja" | "name_zh" | "icon" | "color" | "description" | "prompt" | "sort_order"
    >
  > & { workflow_pack_key?: WorkflowPackKey },
): Promise<void> {
  const params = new URLSearchParams();
  if (data.workflow_pack_key) params.set("workflow_pack_key", data.workflow_pack_key);
  const query = params.toString();
  await patch(`/api/departments/${id}${query ? `?${query}` : ""}`, data);
}

export async function deleteDepartment(id: string, options?: { workflowPackKey?: WorkflowPackKey }): Promise<void> {
  const params = new URLSearchParams();
  if (options?.workflowPackKey) params.set("workflow_pack_key", options.workflowPackKey);
  const query = params.toString();
  await del(`/api/departments/${id}${query ? `?${query}` : ""}`);
}

export async function reorderDepartments(
  orders: { id: string; sort_order: number }[],
  options?: { workflowPackKey?: WorkflowPackKey },
): Promise<void> {
  const params = new URLSearchParams();
  if (options?.workflowPackKey) params.set("workflow_pack_key", options.workflowPackKey);
  const query = params.toString();
  await patch(`/api/departments/reorder${query ? `?${query}` : ""}`, {
    orders,
    ...(options?.workflowPackKey ? { workflow_pack_key: options.workflowPackKey } : {}),
  });
}

// Agents
export async function getAgents(options?: { includeSeed?: boolean }): Promise<Agent[]> {
  const params = new URLSearchParams();
  if (options?.includeSeed) params.set("include_seed", "1");
  const q = params.toString();
  const j = await request<{ agents: Agent[] }>(`/api/agents${q ? "?" + q : ""}`);
  return j.agents;
}

export async function getAgent(id: string): Promise<Agent> {
  const j = await request<{ agent: Agent }>(`/api/agents/${id}`);
  return j.agent;
}

export async function getMeetingPresence(): Promise<MeetingPresence[]> {
  const j = await request<{ presence: MeetingPresence[] }>("/api/meeting-presence");
  return j.presence;
}

export async function updateAgent(
  id: string,
  data: Partial<
    Pick<
      Agent,
      | "name"
      | "name_ko"
      | "name_ja"
      | "name_zh"
      | "status"
      | "current_task_id"
      | "department_id"
      | "role"
      | "acts_as_planning_leader"
      | "cli_provider"
      | "oauth_account_id"
      | "api_provider_id"
      | "api_model"
      | "cli_model"
      | "cli_reasoning_level"
      | "enable_planning_phase"
      | "specialty"
      | "autonomy_level"
      | "max_concurrent_tasks"
      | "avatar_emoji"
      | "sprite_number"
      | "personality"
      | "persona_id"
    >
  > & {
    workflow_pack_key?: WorkflowPackKey;
    force_planning_leader_override?: boolean;
  },
): Promise<void> {
  await patch(`/api/agents/${id}`, data);
}

export async function createAgent(data: {
  name: string;
  name_ko: string;
  name_ja?: string;
  name_zh?: string;
  department_id: string | null;
  role: string;
  cli_provider: string;
  avatar_emoji: string;
  sprite_number?: number | null;
  personality: string | null;
  specialty?: string | null;
  autonomy_level?: string | null;
  max_concurrent_tasks?: number | null;
  workflow_pack_key?: WorkflowPackKey;
}): Promise<Agent> {
  const j = (await post("/api/agents", data)) as { ok: boolean; agent: Agent };
  return j.agent;
}

export async function uploadAgentAvatar(agentId: string, imageDataUrl: string): Promise<{ avatar_url: string }> {
  const j = (await post(`/api/agents/${agentId}/avatar`, { image: imageDataUrl })) as { ok: boolean; avatar_url: string };
  return { avatar_url: j.avatar_url };
}

export async function deleteAgentAvatar(agentId: string): Promise<void> {
  await del(`/api/agents/${agentId}/avatar`);
}

export async function generatePersona(data: {
  name: string;
  role: string;
  department_id: string | null;
  lang: string;
}): Promise<string> {
  const j = (await post("/api/agents/generate-persona", data)) as { ok: boolean; personality: string };
  return j.personality;
}

export async function deleteAgent(id: string): Promise<void> {
  await del(`/api/agents/${id}`);
}

export async function getAgentPersona(agentId: string): Promise<string> {
  const j = (await request<{ agentId: string; text: string }>(`/api/agents/${agentId}/persona`));
  return j.text ?? "";
}

export async function saveAgentPersona(agentId: string, text: string): Promise<void> {
  await put(`/api/agents/${agentId}/persona`, { text });
}

export interface AgentPerformanceData {
  ok: boolean;
  agent_id: string;
  stats: {
    tasks_total: number;
    tasks_done: number;
    tasks_failed: number;
    success_rate: number;
    avg_duration_ms: number | null;
    xp: number;
  };
  recent_tasks: Array<{
    id: string;
    title: string;
    status: string;
    started_at: number | null;
    completed_at: number | null;
    department_id: string | null;
    workflow_pack_key: string | null;
    context_hint?: string | null;
  }>;
  by_pack: Array<{ pack: string; cnt: number; done_cnt: number }>;
}

export async function getAgentPerformance(id: string): Promise<AgentPerformanceData> {
  return request<AgentPerformanceData>(`/api/agents/${id}/performance`);
}

export interface AgentFitnessByType {
  task_type: string;
  success_rate: number;
  total: number;
}

export interface AgentPerformanceEntry {
  agent_id: string;
  agent_name: string;
  total: number;
  done: number;
  cancelled: number;
  failed_exec: number;
  in_progress: number;
  review: number;
  planned: number;
  success_rate: number | null;
  avg_duration_ms: number | null;
  fitness_by_type?: AgentFitnessByType[];
}

export async function getAgentsPerformance(projectId?: string): Promise<AgentPerformanceEntry[]> {
  const qs = projectId ? `?project_id=${projectId}` : "";
  const data = await request<{ agents: AgentPerformanceEntry[] }>(`/api/agents/performance${qs}`);
  return data.agents;
}

// Tasks
export async function getTasks(filters?: {
  status?: TaskStatus;
  department_id?: string;
  agent_id?: string;
  project_id?: string;
  workflow_pack_key?: WorkflowPackKey;
  context_hint?: string;
}): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.department_id) params.set("department_id", filters.department_id);
  if (filters?.agent_id) params.set("agent_id", filters.agent_id);
  if (filters?.project_id) params.set("project_id", filters.project_id);
  if (filters?.context_hint) params.set("context_hint", filters.context_hint);
  else if (filters?.workflow_pack_key) params.set("workflow_pack_key", filters.workflow_pack_key);
  const q = params.toString();
  const j = await request<{ tasks: Task[] }>(`/api/tasks${q ? "?" + q : ""}`);
  return j.tasks;
}

export async function getTask(id: string): Promise<{ task: Task; logs: TaskLog[]; subtasks: SubTask[] }> {
  return request(`/api/tasks/${id}`);
}

export async function getTaskExecution(
  id: string,
): Promise<{ execution: TaskExecutionSummary; latest_event: TaskExecutionEvent | null }> {
  return request(`/api/tasks/${id}/execution`);
}

export async function getTaskExecutionEvents(
  id: string,
  limit = 20,
): Promise<{ events: TaskExecutionEvent[] }> {
  return request(`/api/tasks/${id}/execution-events?limit=${Math.max(1, Math.min(500, Math.trunc(limit)))}`);
}

export async function createTask(input: {
  title: string;
  description?: string;
  department_id?: string;
  task_type?: TaskType;
  priority?: number;
  project_id?: string;
  project_path?: string;
  assigned_agent_id?: string;
  workflow_pack_key?: WorkflowPackKey;
  context_hint?: string;
  workflow_meta_json?: Record<string, unknown> | string;
  output_format?: string;
  handoff_to_agent_id?: string | null;
  handoff_condition?: "always" | "on_success" | "on_fail" | null;
  kb_context_sources?: string | null;
  figma_url?: string | null;
}): Promise<string> {
  // dual-write: send context_hint = workflow_pack_key if not explicitly provided
  const payload = { ...input };
  if (payload.workflow_pack_key && !payload.context_hint) {
    payload.context_hint = payload.workflow_pack_key;
  }
  const j = (await post("/api/tasks", payload)) as { id: string };
  return j.id;
}

export async function updateTask(
  id: string,
  data: Partial<
    Pick<
      Task,
      | "title"
      | "description"
      | "status"
      | "priority"
      | "task_type"
      | "department_id"
      | "project_id"
      | "project_path"
      | "workflow_pack_key"
      | "context_hint"
      | "workflow_meta_json"
      | "output_format"
      | "hidden"
    >
  >,
): Promise<void> {
  await patch(`/api/tasks/${id}`, data);
}

export async function bulkHideTasks(statuses: string[], hidden: 0 | 1): Promise<void> {
  await post("/api/tasks/bulk-hide", { statuses, hidden });
}

export async function deleteTask(id: string): Promise<void> {
  await del(`/api/tasks/${id}`);
}

export async function assignTask(id: string, agentId: string): Promise<void> {
  await post(`/api/tasks/${id}/assign`, { agent_id: agentId });
}

export async function runTask(id: string): Promise<void> {
  await post(`/api/tasks/${id}/run`);
}

export async function stopTask(id: string): Promise<void> {
  await post(`/api/tasks/${id}/stop`, { mode: "cancel" });
}

export async function cliCompleteTask(id: string, exitCode = 0): Promise<void> {
  await post(`/api/tasks/${id}/cli-complete`, { exit_code: exitCode });
}

export async function pauseTask(id: string): Promise<{
  ok: boolean;
  stopped: boolean;
  status: string;
  pid?: number;
  rolled_back?: boolean;
  message?: string;
  interrupt?: {
    session_id: string;
    control_token: string;
    requires_csrf: boolean;
  } | null;
}> {
  await bootstrapSession({ promptOnUnauthorized: false });
  return post(`/api/tasks/${id}/stop`, { mode: "pause" });
}

export async function resumeTask(id: string): Promise<void> {
  await bootstrapSession({ promptOnUnauthorized: false });
  await post(`/api/tasks/${id}/resume`);
}

export async function injectTaskPrompt(
  id: string,
  input: {
    session_id: string;
    interrupt_token: string;
    prompt: string;
  },
): Promise<{ ok: boolean; queued: boolean; session_id: string; prompt_hash: string; pending_count: number }> {
  await bootstrapSession({ promptOnUnauthorized: false });
  return post(`/api/tasks/${id}/inject`, input);
}

// Projects
export interface ProjectTaskHistoryItem {
  id: string;
  title: string;
  status: string;
  task_type: string;
  priority: number;
  source_task_id?: string | null;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
  assigned_agent_id: string | null;
  assigned_agent_name: string;
  assigned_agent_name_ko: string;
  department_id?: string | null;
  department_name?: string;
  department_name_ko?: string;
}

export interface ProjectReportHistoryItem {
  id: string;
  title: string;
  completed_at: number | null;
  created_at: number;
  assigned_agent_id: string | null;
  agent_name: string;
  agent_name_ko: string;
  dept_name: string;
  dept_name_ko: string;
}

export interface ProjectDecisionEventItem {
  id: number;
  snapshot_hash: string | null;
  event_type:
    | "planning_summary"
    | "representative_pick"
    | "followup_request"
    | "start_review_meeting"
    | "start_review_meeting_blocked";
  summary: string;
  selected_options_json: string | null;
  note: string | null;
  task_id: string | null;
  meeting_id: string | null;
  created_at: number;
}

export interface ProjectDetailResponse {
  project: Project;
  assigned_agents?: Agent[];
  tasks: ProjectTaskHistoryItem[];
  reports: ProjectReportHistoryItem[];
  decision_events: ProjectDecisionEventItem[];
}

export async function getProjects(params?: { page?: number; page_size?: number; search?: string }): Promise<{
  projects: Project[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.page_size) sp.set("page_size", String(params.page_size));
  if (params?.search) sp.set("search", params.search);
  const q = sp.toString();
  return request(`/api/projects${q ? `?${q}` : ""}`);
}

export async function createProject(input: {
  name: string;
  project_path: string;
  core_goal: string;
  figma_url?: string | null;
  default_pack_key?: WorkflowPackKey;
  create_path_if_missing?: boolean;
  github_repo?: string;
  assignment_mode?: "auto" | "manual";
  agent_ids?: string[];
  role_assignments?: Array<{ agentId: string; role: string }>;
  directive?: string | null;
  directive_type_slug?: string | null;
  project_type?: "project" | "app";
}): Promise<Project> {
  const j = (await post("/api/projects", input)) as { ok: boolean; project: Project };
  return j.project;
}

export async function updateProject(
  id: string,
  patchData: Partial<Pick<Project, "name" | "project_path" | "core_goal" | "default_pack_key">> & {
    figma_url?: string | null;
    create_path_if_missing?: boolean;
    github_repo?: string | null;
    assignment_mode?: "auto" | "manual";
    agent_ids?: string[];
    directive?: string | null;
    directive_type_slug?: string | null;
  },
): Promise<Project> {
  const j = (await patch(`/api/projects/${id}`, patchData)) as { ok: boolean; project: Project };
  return j.project;
}

export interface DirectiveTemplateItem {
  slug: string;
  name: string;
  name_ko: string;
  icon: string;
  color: string;
  description: string;
  description_ko: string;
  departments: string[];
  template: string;
}

export async function fetchDirectiveTemplates(): Promise<DirectiveTemplateItem[]> {
  const data = await request<{ templates: DirectiveTemplateItem[] }>("/api/directive-templates");
  return data.templates;
}

export interface ProjectPathCheckResult {
  normalized_path: string;
  exists: boolean;
  is_directory: boolean;
  can_create: boolean;
  nearest_existing_parent: string | null;
}

export interface ProjectPathBrowseEntry {
  name: string;
  path: string;
}

export interface ProjectPathBrowseResult {
  current_path: string;
  parent_path: string | null;
  entries: ProjectPathBrowseEntry[];
  truncated: boolean;
}

export async function checkProjectPath(pathInput: string): Promise<ProjectPathCheckResult> {
  const sp = new URLSearchParams();
  sp.set("path", pathInput);
  const j = await request<{ ok: boolean } & ProjectPathCheckResult>(`/api/projects/path-check?${sp.toString()}`);
  return {
    normalized_path: j.normalized_path,
    exists: j.exists,
    is_directory: j.is_directory,
    can_create: j.can_create,
    nearest_existing_parent: j.nearest_existing_parent,
  };
}

export async function getProjectPathSuggestions(query: string, limit = 30): Promise<string[]> {
  const sp = new URLSearchParams();
  if (query.trim()) sp.set("q", query.trim());
  sp.set("limit", String(limit));
  const j = await request<{ ok: boolean; paths: string[] }>(`/api/projects/path-suggestions?${sp.toString()}`);
  return j.paths ?? [];
}

export async function browseProjectPath(pathInput?: string): Promise<ProjectPathBrowseResult> {
  const sp = new URLSearchParams();
  if (pathInput && pathInput.trim()) sp.set("path", pathInput.trim());
  const q = sp.toString();
  const j = await request<{
    ok: boolean;
    current_path: string;
    parent_path: string | null;
    entries: ProjectPathBrowseEntry[];
    truncated: boolean;
  }>(`/api/projects/path-browse${q ? `?${q}` : ""}`);
  return {
    current_path: j.current_path,
    parent_path: j.parent_path,
    entries: j.entries ?? [],
    truncated: Boolean(j.truncated),
  };
}

export async function pickProjectPathNative(): Promise<{ cancelled: boolean; path: string | null }> {
  const j = await request<{
    ok: boolean;
    cancelled?: boolean;
    path?: string;
  }>("/api/projects/path-native-picker", { method: "POST" });
  if (!j.ok) {
    return { cancelled: Boolean(j.cancelled), path: null };
  }
  return { cancelled: false, path: j.path ?? null };
}

export async function deleteProject(id: string): Promise<void> {
  await del(`/api/projects/${id}`);
}

/** Remove a project folder from disk (e.g. after trash). Server enforces allowed roots and refuses if a project row still uses the path. */
export async function deleteProjectDirectory(projectPath: string): Promise<{ ok: boolean; deleted: boolean }> {
  return post("/api/projects/delete-directory", { project_path: projectPath }) as Promise<{ ok: boolean; deleted: boolean }>;
}

export type TrashedPathEntry = { id: string; project_path: string };

/** Try to delete each trashed project's directory. Returns ids to remove from UI trash (successful API calls only). */
export async function deleteTrashedProjectDirectories(
  items: TrashedPathEntry[],
): Promise<{ removedIds: string[]; failedCount: number }> {
  const removedIds: string[] = [];
  let failedCount = 0;
  for (const item of items) {
    try {
      await deleteProjectDirectory(item.project_path);
      removedIds.push(item.id);
    } catch {
      failedCount += 1;
    }
  }
  return { removedIds, failedCount };
}

export async function getProjectDetail(id: string): Promise<ProjectDetailResponse> {
  return request(`/api/projects/${id}`);
}

// File Tree
export interface FileTreeNode {
  name: string;
  type: "dir" | "file";
  children?: FileTreeNode[];
}

export interface ProjectFileTreeResult {
  root: string;
  tree: FileTreeNode[];
  truncated: boolean;
}

// ── Project Templates ─────────────────────────────────────────────────────────

export interface ProjectTemplateObjective {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  order_index: number;
}

export interface ProjectTemplateGate {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  gate_type: string;
  order_index: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  default_pack_key: string;
  core_goal_template: string;
  is_builtin: boolean;
  created_at: number;
  updated_at: number;
  objectives: ProjectTemplateObjective[];
  gates: ProjectTemplateGate[];
}

export async function getProjectTemplates(): Promise<ProjectTemplate[]> {
  const j = await request<{ ok: boolean; templates: ProjectTemplate[] }>("/api/project-templates");
  return j.templates ?? [];
}

export async function createProjectTemplate(input: {
  name: string;
  description?: string;
  category?: string;
  default_pack_key?: string;
  core_goal_template?: string;
  objectives?: Array<{ title: string; description?: string }>;
  gates?: Array<{ title: string; description?: string; gate_type?: string }>;
}): Promise<{ id: string }> {
  return post("/api/project-templates", input) as Promise<{ ok: boolean; id: string }>;
}

export async function deleteProjectTemplate(templateId: string): Promise<void> {
  await del(`/api/project-templates/${templateId}`);
}

export async function applyProjectTemplate(
  projectId: string,
  templateId: string,
): Promise<{ objectives_created: number; gates_created: number }> {
  return post(`/api/projects/${projectId}/apply-template/${templateId}`) as Promise<{
    ok: boolean;
    objectives_created: number;
    gates_created: number;
  }>;
}

// ── Deliverable Checks ────────────────────────────────────────────────────────

export interface ProjectDeliverableItem {
  key: string;
  label: string;
  type: string;
  checked: boolean;
  checked_at: number | null;
  note: string | null;
}

// ── Project Sources ────────────────────────────────────────────────────────────

export interface ProjectSource {
  id: string;
  source_project_id: string;
  source_project_name: string;
  source_category_id: string | null;
  source_category_name: string | null;
  source_category_color: string | null;
  label: string | null;
  sort_order: number;
  checked_count: number;
  total_count: number;
  checked_deliverables: Array<{ key: string; label: string; note: string | null }>;
}

export async function getProjectSources(projectId: string): Promise<ProjectSource[]> {
  const j = await request<{ ok: boolean; sources: ProjectSource[] }>(
    `/api/projects/${projectId}/sources`,
  );
  return j.sources ?? [];
}

export async function addProjectSource(
  projectId: string,
  sourceProjectId: string,
  label?: string,
): Promise<void> {
  await post(`/api/projects/${projectId}/sources`, { source_project_id: sourceProjectId, label: label ?? null });
}

export async function removeProjectSource(projectId: string, sourceId: string): Promise<void> {
  await del(`/api/projects/${projectId}/sources/${sourceId}`);
}

export async function getProjectDeliverables(projectId: string): Promise<ProjectDeliverableItem[]> {
  const j = await request<{ ok: boolean; items: ProjectDeliverableItem[] }>(
    `/api/projects/${projectId}/deliverables`,
  );
  return j.items ?? [];
}

export async function updateProjectDeliverable(
  projectId: string,
  key: string,
  data: { checked: boolean; note?: string | null; label?: string },
): Promise<{ key: string; checked: boolean; checked_at: number | null; note: string | null }> {
  return put(`/api/projects/${projectId}/deliverables/${encodeURIComponent(key)}`, data) as Promise<{
    ok: boolean;
    key: string;
    checked: boolean;
    checked_at: number | null;
    note: string | null;
  }>;
}

// ── Ship Automation: Changelog + Version ──

export interface ChangelogEntry {
  id: string;
  project_id: string;
  version: string;
  task_id: string | null;
  entry_type: string;
  summary: string;
  detail: string | null;
  created_at: number;
}

export async function getProjectChangelog(
  projectId: string,
  opts?: { limit?: number; offset?: number },
): Promise<{ entries: ChangelogEntry[]; total: number }> {
  const sp = new URLSearchParams();
  if (opts?.limit) sp.set("limit", String(opts.limit));
  if (opts?.offset) sp.set("offset", String(opts.offset));
  const qs = sp.toString();
  const res = await request<{ ok: boolean; entries: ChangelogEntry[]; total: number }>(
    `/api/projects/${projectId}/changelog${qs ? `?${qs}` : ""}`,
  );
  return { entries: res.entries ?? [], total: res.total ?? 0 };
}

export async function getProjectVersion(projectId: string): Promise<string> {
  const res = await request<{ ok: boolean; version: string }>(
    `/api/projects/${projectId}/version`,
  );
  return res.version ?? "0.1.0";
}

// ── Team Board (Phase 7) ──

export interface TeamBoardEntry {
  timestamp: string;
  sender: string;
  target: string;
  subject: string;
  body: string;
}

export async function getProjectTeamBoard(projectId: string): Promise<{ content: string | null; entries: TeamBoardEntry[] }> {
  return request(`/api/projects/${projectId}/team-board`);
}

export async function getTaskReportMd(projectId: string, taskId: string): Promise<{ content: string | null }> {
  return request(`/api/projects/${projectId}/tasks/${taskId}/report-md`);
}
