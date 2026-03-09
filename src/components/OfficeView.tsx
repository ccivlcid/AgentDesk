import React, { useEffect, useMemo } from "react";
import { useI18n } from "../i18n";
import { useTheme } from "../ThemeContext";
import { usePackVocab } from "../pack-identity/vocabulary";
import PackHud from "./hud/PackHud";
import type { OfficeViewProps } from "./office-view/model";
import { useCliUsage } from "./office-view/useCliUsage";
import { useOfficeViewRefs } from "./office-view/useOfficeViewRefs";
import { useOfficeViewCamera } from "./office-view/useOfficeViewCamera";
import { useOfficeViewInteractions } from "./office-view/useOfficeViewInteractions";
import { useOfficeViewBuildScene } from "./office-view/useOfficeViewBuildScene";
import { useOfficeViewUIState } from "./office-view/useOfficeViewUIState";
import { useOfficeViewTickerAndDelivery } from "./office-view/useOfficeViewTickerAndDelivery";
import OfficeViewToolbar from "./office-view/OfficeViewToolbar";
import OfficeViewBody from "./office-view/OfficeViewBody";
import OfficeViewActionBar from "./office-view/OfficeViewActionBar";

export default function OfficeView({
  departments,
  agents,
  tasks,
  subAgents,
  meetingPresence,
  activeMeetingTaskId,
  unreadAgentIds,
  crossDeptDeliveries,
  onCrossDeptDeliveryProcessed,
  ceoOfficeCalls,
  onCeoOfficeCallProcessed,
  onOpenActiveMeetingMinutes,
  customDeptThemes,
  themeHighlightTargetId,
  onSelectAgent,
  onSelectDepartment,
  cliStatus: cliStatusProp,
  cliUsage: cliUsageProp,
  cliUsageRef: cliUsageRefProp,
  cliUsageRefreshing: cliUsageRefreshingProp,
  onRefreshCliUsage: onRefreshCliUsageProp,
  onOpenRoomManager,
  activeWorkflowPackKey,
}: OfficeViewProps) {
  const { language, t } = useI18n();
  const packVocab = usePackVocab(activeWorkflowPackKey ?? "development");
  const { theme: currentTheme } = useTheme();

  const cliUsageFromHook = useCliUsage(tasks);
  const cliStatus = cliStatusProp ?? cliUsageFromHook.cliStatus;
  const cliUsage = cliUsageProp ?? cliUsageFromHook.cliUsage;
  const cliUsageRef = cliUsageRefProp ?? cliUsageFromHook.cliUsageRef;
  const cliUsageRefreshing = cliUsageRefreshingProp ?? cliUsageFromHook.refreshing;
  const onRefreshCliUsage = onRefreshCliUsageProp ?? cliUsageFromHook.handleRefreshUsage;

  const refs = useOfficeViewRefs({
    departments,
    agents,
    tasks,
    subAgents,
    unreadAgentIds,
    meetingPresence,
    customDeptThemes,
    language,
    currentTheme,
    themeHighlightTargetId,
    activeMeetingTaskId,
    onOpenActiveMeetingMinutes,
  });

  const camera = useOfficeViewCamera({
    containerRef: refs.containerRef,
    appRef: refs.appRef,
    totalHRef: refs.totalHRef,
    dataRef: refs.dataRef,
    isOverviewModeRef: refs.isOverviewModeRef,
    cameraTargetRef: refs.cameraTargetRef,
  });

  const interactions = useOfficeViewInteractions({
    roomRectsRef: refs.roomRectsRef,
    ceoPosRef: refs.ceoPosRef,
    dataRef: refs.dataRef,
    cbRef: refs.cbRef,
    elevatorStateRef: refs.elevatorStateRef,
    selectedFloorIdxRef: refs.selectedFloorIdxRef,
    appRef: refs.appRef,
    showVirtualPadRef: refs.showVirtualPadRef,
    isOverviewModeRef: refs.isOverviewModeRef,
    towerOffsetXRef: refs.towerOffsetXRef,
    setSelectedAgent: refs.setSelectedAgent,
    setSelectedDept: refs.setSelectedDept,
    scrollToFloorY: camera.scrollToFloorY,
    exitOverviewAndScroll: camera.exitOverviewAndScroll,
    keysRef: refs.keysRef,
  });

  useEffect(() => {
    refs.cbRef.current = {
      onSelectAgent: interactions.handleCanvasSelectAgent,
      onSelectDepartment: interactions.handleCanvasSelectDept,
    };
  }, [interactions.handleCanvasSelectAgent, interactions.handleCanvasSelectDept, refs.cbRef]);

  const buildScene = useOfficeViewBuildScene({
    ...refs,
    firstBuildDoneRef: refs.firstBuildDoneRef,
    initDoneRef: refs.initDoneRef,
    isOverviewModeRef: refs.isOverviewModeRef,
    cameraTargetRef: refs.cameraTargetRef,
    setCurrentSeasonKey: refs.setCurrentSeasonKey,
    setDeptFloorOrder: refs.setDeptFloorOrder,
    deptFloorOrder: refs.deptFloorOrder,
    applyCameraOverview: camera.applyCameraOverview,
    getFloorFocusZoom: camera.getFloorFocusZoom,
  });

  useOfficeViewTickerAndDelivery({
    refs,
    buildScene,
    interactions,
    cliUsageRef,
    meetingPresence,
    language,
    crossDeptDeliveries,
    onCrossDeptDeliveryProcessed,
    ceoOfficeCalls,
    onCeoOfficeCallProcessed,
    departments,
    agents,
    tasks,
    subAgents,
    unreadAgentIds,
    activeMeetingTaskId,
    customDeptThemes,
    currentTheme,
  });

  const uiState = useOfficeViewUIState({
    containerRef: refs.containerRef,
    appRef: refs.appRef,
    totalHRef: refs.totalHRef,
    cameraTargetRef: refs.cameraTargetRef,
    isOverviewModeRef: refs.isOverviewModeRef,
    dataRef: refs.dataRef,
    visitorTickRef: refs.visitorTickRef,
    setShowVirtualPad: refs.setShowVirtualPad,
    showVirtualPad: refs.showVirtualPad,
    clearVirtualMovement: interactions.clearVirtualMovement,
    applyCameraOverview: camera.applyCameraOverview,
    applyCameraFloorFocus: camera.applyCameraFloorFocus,
    updateFloorIndicator: camera.updateFloorIndicator,
    exitOverviewAndScroll: camera.exitOverviewAndScroll,
    scrollToFloorY: camera.scrollToFloorY,
    tasks,
  });

  const fmTickerEvents = useMemo(() => {
    const working = agents.filter((a) => a.status === "working");
    const idle = agents.filter((a) => a.status === "idle");
    const onBreak = agents.filter((a) => a.status === "break");
    const activeTasks = tasks.filter((t) => t.status === "in_progress");
    const doneTasks = tasks.filter((t) => t.status === "done");
    const events: string[] = [];
    if (agents.length > 0) {
      const actPct = Math.round((working.length / agents.length) * 100);
      events.push(
        `HQ CAPACITY ${actPct}% · ${working.length}/${agents.length} ${packVocab.agents.toUpperCase()} ACTIVE`
      );
    }
    if (working.length > 0) {
      const sample = working.slice(0, 3);
      for (const a of sample) {
        const task = tasks.find(
          (t) => t.assigned_agent_id === a.id && t.status === "in_progress"
        );
        if (task) events.push(`${a.avatar_emoji} ${a.name} >> ${task.title.slice(0, 30)}`);
      }
    }
    const topDept = departments
      .map((d) => {
        const das = agents.filter((a) => a.department_id === d.id);
        const runCount = das.filter((a) => a.status === "working").length;
        return { d, pct: das.length > 0 ? Math.round((runCount / das.length) * 100) : 0 };
      })
      .sort((a, b) => b.pct - a.pct)[0];
    if (topDept && topDept.pct > 0) {
      events.push(`${topDept.d.icon} ${topDept.d.name} LEADS AT ${topDept.pct}% ACTIVITY`);
    }
    if (idle.length > 0)
      events.push(
        `${idle.length} ${packVocab.agent.toUpperCase()}${idle.length > 1 ? "S" : ""} ${packVocab.idle.toUpperCase()} — AWAITING ASSIGNMENT`
      );
    if (onBreak.length > 0)
      events.push(`${onBreak.length} IN ${packVocab.breakRoom.toUpperCase()}`);
    if (uiState.visitorCount > 0)
      events.push(
        `${uiState.visitorCount} ${packVocab.agent.toUpperCase()}${uiState.visitorCount > 1 ? "S" : ""} ON INTER-DEPT VISIT`
      );
    if (activeTasks.length > 0)
      events.push(
        `${activeTasks.length} ${packVocab.task.toUpperCase()}${activeTasks.length > 1 ? "S" : ""} IN PROGRESS`
      );
    if (doneTasks.length > 0)
      events.push(
        `${doneTasks.length} ${packVocab.task.toUpperCase()}${doneTasks.length > 1 ? "S" : ""} ${packVocab.done.toUpperCase()}`
      );
    const topXpAgent = [...agents].sort((a, b) => (b.stats_xp ?? 0) - (a.stats_xp ?? 0))[0];
    if (topXpAgent && (topXpAgent.stats_xp ?? 0) > 0) {
      events.push(
        `TOP PERFORMER: ${topXpAgent.avatar_emoji} ${topXpAgent.name} · ${(topXpAgent.stats_xp ?? 0).toLocaleString()} ${packVocab.xp}`
      );
    }
    if (events.length === 0) events.push("AGENTDESK HQ — ALL SYSTEMS NOMINAL");
    return events.join("     //     ");
  }, [agents, tasks, departments, uiState.visitorCount, packVocab]);

  return (
    <div className="office-screen">
      <OfficeViewToolbar
        isOverviewMode={camera.isOverviewMode}
        handleToggleOverview={camera.handleToggleOverview}
        applyCameraOverview={camera.applyCameraOverview}
        applyCameraFloorFocus={camera.applyCameraFloorFocus}
        onOpenRoomManager={onOpenRoomManager}
        departmentCount={departments.length}
        workingCount={agents.filter((a) => a.status === "working").length}
        inProgressTaskCount={tasks.filter((t) => t.status === "in_progress").length}
        visitorCount={uiState.visitorCount}
        currentSeasonKey={refs.currentSeasonKey}
        clockStr={uiState.clockStr}
        packVocab={packVocab}
      />
      <OfficeViewBody
        containerRef={refs.containerRef}
        appRef={refs.appRef}
        sortedDepartments={refs.sortedDepartments}
        agents={agents}
        tasks={tasks}
        departments={departments}
        selectedDept={refs.selectedDept}
        selectedAgent={refs.selectedAgent}
        setSelectedDept={refs.setSelectedDept}
        setSelectedAgent={refs.setSelectedAgent}
        handleCanvasSelectDept={interactions.handleCanvasSelectDept}
        handleCallElevator={interactions.handleCallElevator}
        handleScrollToFloor={interactions.handleScrollToFloor}
        visitorsByDeptId={uiState.visitorsByDeptId}
        cliStatus={cliStatus}
        cliUsage={cliUsage}
        cliUsageRefreshing={cliUsageRefreshing}
        onRefreshCliUsage={onRefreshCliUsage}
        isOverviewMode={camera.isOverviewMode}
        showVirtualPad={refs.showVirtualPad}
        t={t}
        triggerDepartmentInteract={interactions.triggerDepartmentInteract}
        setMoveDirectionPressed={interactions.setMoveDirectionPressed}
        exitOverviewAndScroll={camera.exitOverviewAndScroll}
        customDeptThemes={customDeptThemes}
        totalH={refs.totalHRef.current}
        floorIndicator={uiState.floorIndicator}
        announcementBanner={uiState.announcementBanner}
        completionBursts={uiState.completionBursts}
        onSelectAgent={onSelectAgent}
        onSelectDepartment={onSelectDepartment}
        ceoIncomingCount={uiState.ceoIncomingCount}
        visitingAgentIds={uiState.visitingAgentIds}
      />
      <div className="office-fm-ticker" aria-label="Live event feed">
        <span className="office-fm-ticker__label">
          <span className="office-fm-ticker__dot" />
          LIVE
        </span>
        <div className="office-fm-ticker__track">
          <span className="office-fm-ticker__text">{fmTickerEvents}</span>
        </div>
      </div>
      <PackHud
        packKey={activeWorkflowPackKey ?? "development"}
        agents={agents}
        tasks={tasks}
      />
      <OfficeViewActionBar
        packVocab={packVocab}
        agents={agents}
        tasks={tasks}
        departmentCount={departments.length}
        visitorCount={uiState.visitorCount}
      />
    </div>
  );
}
