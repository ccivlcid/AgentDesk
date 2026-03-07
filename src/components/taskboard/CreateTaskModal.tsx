import { useCallback, useEffect, useMemo, useState } from "react";
import type { Agent, Department, TaskType, WorkflowPackKey } from "../../types";
import type { WorkflowPackConfig } from "../../api/workflow-skills-subtasks";
import { getWorkflowPacks } from "../../api/workflow-skills-subtasks";
import { getTaskTemplates, createTaskTemplate, deleteTaskTemplate, type TaskTemplate } from "../../api/task-templates";
import { useI18n } from "../../i18n";
import { type CreateTaskDraft, type FormFeedback } from "./constants";
import type { CreateTaskModalOverlaysProps } from "./create-modal/overlay-types";
import CreateTaskModalView from "./create-modal/CreateTaskModalView";
import { submitTaskWithProjectHandling } from "./create-modal/submit-task";
import { useDraftState } from "./create-modal/useDraftState";
import { usePathHelperMessages } from "./create-modal/usePathHelperMessages";
import { useProjectPickerState } from "./create-modal/useProjectPickerState";

interface CreateModalProps {
  agents: Agent[];
  departments: Department[];
  onClose: () => void;
  onCreate: (input: {
    title: string;
    description?: string;
    department_id?: string;
    task_type?: string;
    priority?: number;
    project_id?: string;
    project_path?: string;
    assigned_agent_id?: string;
    workflow_pack_key?: WorkflowPackKey;
    workflow_meta_json?: string;
  }) => void;
  onAssign: (taskId: string, agentId: string) => void;
  activeWorkflowPackKey?: WorkflowPackKey;
}

function CreateModal({ agents, departments, onClose, onCreate, onAssign, activeWorkflowPackKey }: CreateModalProps) {
  void onAssign;
  const { t, language: locale, locale: localeTag } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [packConfig, setPackConfig] = useState<WorkflowPackConfig | null>(null);
  const [packMeta, setPackMeta] = useState<Record<string, string>>({});
  const [departmentId, setDepartmentId] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("general");
  const [priority, setPriority] = useState(3);
  const [assignAgentId, setAssignAgentId] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitWithoutProjectPromptOpen, setSubmitWithoutProjectPromptOpen] = useState(false);
  const [formFeedback, setFormFeedback] = useState<FormFeedback | null>(null);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);

  useEffect(() => {
    getTaskTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handleLoadTemplate = useCallback(
    (templateId: string) => {
      const tpl = templates.find((t) => t.id === templateId);
      if (!tpl) return;
      setTitle(tpl.title);
      setDescription(tpl.description);
      setDepartmentId(tpl.department_id ?? "");
      setTaskType((tpl.task_type as TaskType) || "general");
      setPriority(tpl.priority);
      if (tpl.workflow_meta_json) {
        try {
          setPackMeta(JSON.parse(tpl.workflow_meta_json));
        } catch { /* ignore */ }
      }
    },
    [templates],
  );

  const handleSaveTemplate = useCallback(
    async (templateName: string) => {
      const nonEmptyMeta = Object.fromEntries(Object.entries(packMeta).filter(([, v]) => v.trim()));
      const tpl = await createTaskTemplate({
        name: templateName,
        title,
        description,
        department_id: departmentId || null,
        task_type: taskType,
        priority,
        workflow_pack_key: activeWorkflowPackKey ?? null,
        workflow_meta_json: Object.keys(nonEmptyMeta).length > 0 ? JSON.stringify(nonEmptyMeta) : null,
      });
      setTemplates((prev) => [tpl, ...prev]);
    },
    [title, description, departmentId, taskType, priority, packMeta, activeWorkflowPackKey],
  );

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    await deleteTaskTemplate(templateId);
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }, []);

  useEffect(() => {
    if (!activeWorkflowPackKey || activeWorkflowPackKey === "development") {
      setPackConfig(null);
      return;
    }
    getWorkflowPacks()
      .then((res) => {
        const found = res.packs.find((p) => p.key === activeWorkflowPackKey);
        setPackConfig(found ?? null);
      })
      .catch(() => setPackConfig(null));
  }, [activeWorkflowPackKey]);

  /** 현재 오피스 팩에 소속된 에이전트만 사용(직원 필터링). */
  const agentsInCurrentPack = useMemo(() => {
    if (!activeWorkflowPackKey || activeWorkflowPackKey === "development") {
      return agents.filter((a) => !a.workflow_pack_key || a.workflow_pack_key === "development");
    }
    return agents.filter((a) => a.workflow_pack_key === activeWorkflowPackKey);
  }, [agents, activeWorkflowPackKey]);

  const filteredAgents = useMemo(
    () =>
      departmentId
        ? agentsInCurrentPack.filter((agent) => agent.department_id === departmentId)
        : agentsInCurrentPack,
    [agentsInCurrentPack, departmentId],
  );

  /** 현재 오피스 팩에 직원이 한 명이라도 있는 부서만 부서 드롭다운에 표시 */
  const departmentsInCurrentPack = useMemo(() => {
    const deptIds = new Set(agentsInCurrentPack.map((a) => a.department_id).filter(Boolean));
    return departments.filter((d) => deptIds.has(d.id));
  }, [departments, agentsInCurrentPack]);

  const { unsupportedPathApiMessage, resolvePathHelperErrorMessage } = usePathHelperMessages(t);

  const projectPicker = useProjectPickerState({
    unsupportedPathApiMessage,
    resolvePathHelperErrorMessage,
    setFormFeedback,
    setSubmitWithoutProjectPromptOpen,
  });

  const applyFormStateFromDraft = useCallback(
    (draft: CreateTaskDraft) => {
      setTitle(draft.title);
      setDescription(draft.description);
      setDepartmentId(draft.departmentId);
      setTaskType(draft.taskType);
      setPriority(draft.priority);
      setAssignAgentId(draft.assignAgentId);
      projectPicker.setProjectId(draft.projectId);
      projectPicker.setProjectQuery(draft.projectQuery);
      projectPicker.setCreateNewProjectMode(draft.createNewProjectMode);
      projectPicker.setNewProjectPath(draft.newProjectPath);
      projectPicker.setProjectDropdownOpen(false);
      projectPicker.setProjectActiveIndex(-1);
    },
    [projectPicker],
  );

  const {
    drafts,
    restorePromptOpen,
    setRestorePromptOpen,
    selectedRestoreDraftId,
    setSelectedRestoreDraftId,
    draftModalOpen,
    setDraftModalOpen,
    restoreCandidates,
    selectedRestoreDraft,
    formatDraftTimestamp,
    applyDraft,
    deleteDraft,
    clearDrafts,
    handleRequestClose,
  } = useDraftState({
    localeTag,
    submitBusy,
    formState: {
      title,
      description,
      departmentId,
      taskType,
      priority,
      assignAgentId,
      projectId: projectPicker.projectId,
      projectQuery: projectPicker.projectQuery,
      createNewProjectMode: projectPicker.createNewProjectMode,
      newProjectPath: projectPicker.newProjectPath,
    },
    applyFormState: applyFormStateFromDraft,
    onClose,
  });

  const wrappedOnCreate: typeof onCreate = useCallback(
    (input) => {
      const nonEmptyMeta = Object.fromEntries(Object.entries(packMeta).filter(([, v]) => v.trim()));
      if (Object.keys(nonEmptyMeta).length > 0) {
        return onCreate({ ...input, workflow_meta_json: JSON.stringify(nonEmptyMeta) });
      }
      return onCreate(input);
    },
    [onCreate, packMeta],
  );

  async function submitTask(options?: { allowCreateMissingPath?: boolean; allowWithoutProject?: boolean }) {
    await submitTaskWithProjectHandling(
      {
        title,
        description,
        departmentId,
        taskType,
        priority,
        assignAgentId,
        projectId: projectPicker.projectId,
        projectQuery: projectPicker.projectQuery,
        createNewProjectMode: projectPicker.createNewProjectMode,
        newProjectPath: projectPicker.newProjectPath,
        selectedProject: projectPicker.selectedProject,
        projects: projectPicker.projects,
        submitBusy,
        t,
        unsupportedPathApiMessage,
        resolvePathHelperErrorMessage,
        onCreate: wrappedOnCreate,
        onClose,
        selectProject: projectPicker.selectProject,
        setFormFeedback,
        setSubmitWithoutProjectPromptOpen,
        setSubmitBusy,
        setProjectId: projectPicker.setProjectId,
        setProjectQuery: projectPicker.setProjectQuery,
        setCreateNewProjectMode: projectPicker.setCreateNewProjectMode,
        setProjects: projectPicker.setProjects,
        setMissingPathPrompt: projectPicker.setMissingPathPrompt,
        setNewProjectPath: projectPicker.setNewProjectPath,
        setPathApiUnsupported: projectPicker.setPathApiUnsupported,
        setProjectDropdownOpen: projectPicker.setProjectDropdownOpen,
      },
      options,
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void submitTask();
  }

  const handlePriorityChange = useCallback((nextPriority: number) => {
    setPriority(nextPriority);
    setFormFeedback(null);
  }, []);

  const handleAssignAgentChange = useCallback((agentIdValue: string) => {
    setAssignAgentId(agentIdValue);
    setFormFeedback(null);
  }, []);

  const projectSectionProps = {
    t,
    projectPickerRef: projectPicker.projectPickerRef,
    projectQuery: projectPicker.projectQuery,
    projectDropdownOpen: projectPicker.projectDropdownOpen,
    projectActiveIndex: projectPicker.projectActiveIndex,
    projectsLoading: projectPicker.projectsLoading,
    filteredProjects: projectPicker.filteredProjects,
    selectedProject: projectPicker.selectedProject,
    projects: projectPicker.projects,
    createNewProjectMode: projectPicker.createNewProjectMode,
    newProjectPath: projectPicker.newProjectPath,
    pathApiUnsupported: projectPicker.pathApiUnsupported,
    pathSuggestionsOpen: projectPicker.pathSuggestionsOpen,
    pathSuggestionsLoading: projectPicker.pathSuggestionsLoading,
    pathSuggestions: projectPicker.pathSuggestions,
    missingPathPrompt: projectPicker.missingPathPrompt,
    nativePathPicking: projectPicker.nativePathPicking,
    nativePickerUnsupported: projectPicker.nativePickerUnsupported,
    onProjectQueryChange: projectPicker.handleProjectQueryChange,
    onProjectInputFocus: () => projectPicker.setProjectDropdownOpen(true),
    onProjectInputKeyDown: projectPicker.handleProjectInputKeyDown,
    onToggleProjectDropdown: projectPicker.handleToggleProjectDropdown,
    onSelectProject: projectPicker.selectProject,
    onProjectHover: projectPicker.handleProjectHover,
    onEnableCreateNewProject: projectPicker.handleEnableCreateNewProject,
    onNewProjectPathChange: projectPicker.handleNewProjectPathChange,
    onOpenManualPathBrowser: projectPicker.handleOpenManualPathBrowser,
    onTogglePathSuggestions: projectPicker.handleTogglePathSuggestions,
    onPickNativePath: () => {
      void projectPicker.handlePickNativePath();
    },
    onSelectPathSuggestion: projectPicker.handleSelectPathSuggestion,
  } as const;

  const overlaysProps: CreateTaskModalOverlaysProps = {
    t,
    localeTag,
    restorePromptOpen,
    selectedRestoreDraft,
    restoreCandidates,
    selectedRestoreDraftId,
    formatDraftTimestamp,
    submitWithoutProjectPromptOpen,
    missingPathPrompt: projectPicker.missingPathPrompt,
    submitBusy,
    manualPathPickerOpen: projectPicker.manualPathPickerOpen,
    manualPathLoading: projectPicker.manualPathLoading,
    manualPathCurrent: projectPicker.manualPathCurrent,
    manualPathParent: projectPicker.manualPathParent,
    manualPathEntries: projectPicker.manualPathEntries,
    manualPathTruncated: projectPicker.manualPathTruncated,
    manualPathError: projectPicker.manualPathError,
    draftModalOpen,
    drafts,
    onSelectRestoreDraft: (draftId) => setSelectedRestoreDraftId(draftId),
    onCloseRestorePrompt: () => setRestorePromptOpen(false),
    onLoadSelectedRestoreDraft: () => {
      if (!selectedRestoreDraft) return;
      applyDraft(selectedRestoreDraft);
      setRestorePromptOpen(false);
    },
    onCloseSubmitWithoutProjectPrompt: () => setSubmitWithoutProjectPromptOpen(false),
    onConfirmSubmitWithoutProject: () => {
      setSubmitWithoutProjectPromptOpen(false);
      void submitTask({ allowWithoutProject: true });
    },
    onCloseMissingPathPrompt: () => projectPicker.setMissingPathPrompt(null),
    onConfirmCreateMissingPath: () => {
      projectPicker.setMissingPathPrompt(null);
      void submitTask({ allowCreateMissingPath: true });
    },
    onCloseManualPathPicker: () => projectPicker.setManualPathPickerOpen(false),
    onManualPathGoUp: () => {
      if (!projectPicker.manualPathParent) return;
      void projectPicker.loadManualPathEntries(projectPicker.manualPathParent);
    },
    onManualPathRefresh: () => void projectPicker.loadManualPathEntries(projectPicker.manualPathCurrent || undefined),
    onOpenManualPathEntry: (entryPath) => {
      void projectPicker.loadManualPathEntries(entryPath);
    },
    onSelectManualCurrentPath: () => {
      if (!projectPicker.manualPathCurrent) return;
      projectPicker.setNewProjectPath(projectPicker.manualPathCurrent);
      projectPicker.setMissingPathPrompt(null);
      projectPicker.setManualPathPickerOpen(false);
    },
    onCloseDraftModal: () => setDraftModalOpen(false),
    onLoadDraft: (draft) => {
      applyDraft(draft);
      setDraftModalOpen(false);
    },
    onDeleteDraft: deleteDraft,
    onClearDrafts: clearDrafts,
  };

  return (
    <CreateTaskModalView
      t={t}
      locale={locale}
      createNewProjectMode={projectPicker.createNewProjectMode}
      draftsCount={drafts.length}
      title={title}
      description={description}
      departmentId={departmentId}
      taskType={taskType}
      priority={priority}
      assignAgentId={assignAgentId}
      submitBusy={submitBusy}
      formFeedback={formFeedback}
      departments={departmentsInCurrentPack}
      filteredAgents={filteredAgents}
      projectSectionProps={projectSectionProps}
      overlaysProps={overlaysProps}
      onOpenDraftModal={() => {
        setRestorePromptOpen(false);
        setDraftModalOpen(true);
      }}
      onRequestClose={handleRequestClose}
      onSubmit={handleSubmit}
      onTitleChange={(value) => {
        setTitle(value);
        setFormFeedback(null);
      }}
      onDescriptionChange={(value) => {
        setDescription(value);
        setFormFeedback(null);
      }}
      onDepartmentChange={(value) => {
        setFormFeedback(null);
        setDepartmentId(value);
        setAssignAgentId("");
      }}
      onTaskTypeChange={(value) => {
        setTaskType(value);
        setFormFeedback(null);
      }}
      onPriorityChange={handlePriorityChange}
      onAssignAgentChange={handleAssignAgentChange}
      packConfig={packConfig}
      packMeta={packMeta}
      onPackMetaChange={(key, value) => {
        setPackMeta((prev) => ({ ...prev, [key]: value }));
        setFormFeedback(null);
      }}
      templates={templates}
      onLoadTemplate={handleLoadTemplate}
      onSaveTemplate={handleSaveTemplate}
      onDeleteTemplate={handleDeleteTemplate}
    />
  );
}

export default CreateModal;
