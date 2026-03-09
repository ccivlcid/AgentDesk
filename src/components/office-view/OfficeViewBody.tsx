import React from "react";
import { motion } from "framer-motion";
import type { RefObject } from "react";
import type { Application } from "./pixi-compat";
import type { Department, Agent, Task } from "../../types";
import type { MobileMoveDirection } from "./model";
import type { CliStatusMap } from "../../types";
import type { CliUsageEntry } from "../../api";
import type { UiLanguage } from "../../i18n";
import OfficeDeptPanel from "./OfficeDeptPanel";
import OfficeAgentPanel from "./OfficeAgentPanel";
import VirtualPadOverlay from "./VirtualPadOverlay";
import OfficeMinimap from "./OfficeMinimap";
import OfficeOverviewBars from "./OfficeOverviewBars";

type TFunction = (messages: Record<UiLanguage, string>) => string;

export interface OfficeViewBodyProps {
  containerRef: RefObject<HTMLDivElement | null>;
  appRef: RefObject<Application | null>;
  sortedDepartments: Department[];
  agents: Agent[];
  tasks: Task[];
  departments: Department[];
  selectedDept: Department | null;
  selectedAgent: Agent | null;
  setSelectedDept: (dept: Department | null) => void;
  setSelectedAgent: (agent: Agent | null) => void;
  handleCanvasSelectDept: (dept: Department) => void;
  handleCallElevator: (dept: Department, floorIdx: number) => void;
  handleScrollToFloor: (target: "ceo" | "conf" | "basement") => void;
  visitorsByDeptId: Record<string, number>;
  cliStatus: CliStatusMap | null;
  cliUsage: Record<string, CliUsageEntry> | null;
  cliUsageRefreshing: boolean;
  onRefreshCliUsage: () => void;
  isOverviewMode: boolean;
  showVirtualPad: boolean;
  t: TFunction;
  triggerDepartmentInteract: () => void;
  setMoveDirectionPressed: (direction: MobileMoveDirection, pressed: boolean) => void;
  exitOverviewAndScroll: (logicalY: number, offset?: number, areaH?: number) => void;
  customDeptThemes?: Record<string, { floor1: number; floor2: number; wall: number; accent: number }>;
  totalH: number;
  floorIndicator: string | null;
  announcementBanner: { text: string; sender: string } | null;
  completionBursts: Array<{ id: string; x: number; y: number; label: string }>;
  onSelectAgent: (agent: Agent) => void;
  onSelectDepartment: (dept: Department) => void;
  ceoIncomingCount: number;
  visitingAgentIds: Set<string>;
}

export default function OfficeViewBody({
  containerRef,
  appRef,
  sortedDepartments,
  agents,
  tasks,
  departments,
  selectedDept,
  selectedAgent,
  setSelectedDept,
  setSelectedAgent,
  handleCanvasSelectDept,
  handleCallElevator,
  handleScrollToFloor,
  visitorsByDeptId,
  cliStatus,
  cliUsage,
  cliUsageRefreshing,
  onRefreshCliUsage,
  isOverviewMode,
  showVirtualPad,
  t,
  triggerDepartmentInteract,
  setMoveDirectionPressed,
  exitOverviewAndScroll,
  customDeptThemes,
  totalH,
  floorIndicator,
  announcementBanner,
  completionBursts,
  onSelectAgent,
  onSelectDepartment,
  ceoIncomingCount,
  visitingAgentIds,
}: OfficeViewBodyProps) {
  return (
    <div className="office-body">
      <motion.div
        className="office-left"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: "linear" }}
      >
        <OfficeDeptPanel
          departments={sortedDepartments}
          agents={agents}
          tasks={tasks}
          selectedDeptId={selectedDept?.id ?? null}
          onSelectDept={handleCanvasSelectDept}
          onCallElevator={handleCallElevator}
          onScrollToFloor={handleScrollToFloor}
          visitorsByDeptId={visitorsByDeptId}
          cliStatus={cliStatus}
          cliUsage={cliUsage}
          cliUsageRefreshing={cliUsageRefreshing}
          onRefreshCliUsage={onRefreshCliUsage}
          isOverviewMode={isOverviewMode}
        />
      </motion.div>

      <div
        style={{
          position: "relative",
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="office-canvas-wrap" style={{ position: "relative", overflow: "hidden" }}>
          <div
            className="office-canvas-frame"
            style={{ display: "block", width: "100%", height: "100%" }}
          >
            <div
              ref={containerRef}
              style={{
                lineHeight: 0,
                outline: "none",
                display: "block",
                width: "100%",
                height: "100%",
              }}
              tabIndex={0}
            />
          </div>
          {!isOverviewMode && (
            <VirtualPadOverlay
              showVirtualPad={showVirtualPad}
              t={t}
              onInteract={triggerDepartmentInteract}
              onSetMoveDirectionPressed={setMoveDirectionPressed}
            />
          )}
          <OfficeOverviewBars
            departments={sortedDepartments}
            agents={agents}
            tasks={tasks}
            isOverviewMode={isOverviewMode}
            onClickFloor={exitOverviewAndScroll}
            onSelectDept={(dept) => {
              setSelectedDept(dept);
              setSelectedAgent(null);
            }}
            containerRef={containerRef}
            totalH={totalH}
            customDeptThemes={customDeptThemes}
          />
        </div>

        <div
          className="pointer-events-none"
          style={{ position: "absolute", inset: 0, zIndex: 40, overflow: "hidden" }}
        >
          {!isOverviewMode && (
            <div
              className="pointer-events-auto"
              style={{ position: "absolute", bottom: 8, right: 8 }}
            >
              <OfficeMinimap
                departments={sortedDepartments}
                totalH={totalH}
                appRef={appRef}
                isOverviewMode={isOverviewMode}
                customDeptThemes={customDeptThemes}
              />
            </div>
          )}

          {floorIndicator && !isOverviewMode && (
            <div
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 60,
                background: "rgba(0,0,0,0.82)",
                border: "1px solid rgba(245,158,11,0.5)",
                borderRadius: 2,
                padding: "4px 10px",
                fontFamily: "var(--th-font-mono)",
                fontSize: 11,
                color: "var(--th-accent)",
                letterSpacing: 1.5,
                whiteSpace: "nowrap",
                transition: "opacity 0.15s",
              }}
            >
              {floorIndicator}
            </div>
          )}

          {announcementBanner && (
            <motion.div
              key={announcementBanner.text + announcementBanner.sender}
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ duration: 0.25, ease: "linear" }}
              style={{
                position: "absolute",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 80,
                minWidth: 280,
                maxWidth: "90%",
                background: "rgba(0,0,0,0.88)",
                border: "1px solid rgba(245,158,11,0.6)",
                borderRadius: "2px",
                padding: "8px 14px",
                pointerEvents: "none",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  style={{
                    color: "var(--th-accent)",
                    fontSize: 9,
                    fontFamily: "monospace",
                    letterSpacing: 1,
                  }}
                >
                  ◉ BROADCAST
                </span>
                <span style={{ color: "rgba(245,158,11,0.4)", fontSize: 9 }}>|</span>
                <span
                  style={{
                    color: "var(--th-text-primary)",
                    fontSize: 10,
                    fontFamily: "monospace",
                    flex: 1,
                  }}
                >
                  {announcementBanner.text}
                </span>
              </div>
              <div
                style={{
                  color: "rgba(245,158,11,0.55)",
                  fontSize: 8,
                  fontFamily: "monospace",
                  textAlign: "right",
                  marginTop: 2,
                }}
              >
                — {announcementBanner.sender}
              </div>
            </motion.div>
          )}

          {completionBursts.map((burst) => (
            <div
              key={burst.id}
              className="pointer-events-none"
              style={{
                position: "absolute",
                left: `${burst.x}%`,
                top: `${burst.y}%`,
                zIndex: 50,
              }}
            >
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, ri) => (
                <div
                  key={ri}
                  style={{
                    position: "absolute",
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: ri % 2 === 0 ? "var(--th-accent)" : "rgb(52,211,153)",
                    animation: "task-burst-ray 1.2s ease-out forwards",
                    animationDelay: `${ri * 30}ms`,
                    transform: `rotate(${deg}deg)`,
                    transformOrigin: "1.5px 1.5px",
                  }}
                />
              ))}
              <div
                style={{
                  position: "absolute",
                  left: 8,
                  top: -10,
                  whiteSpace: "nowrap",
                  fontSize: 9,
                  fontFamily: "var(--th-font-mono)",
                  color: "var(--th-accent)",
                  background: "rgba(0,0,0,0.7)",
                  padding: "1px 4px",
                  borderRadius: 2,
                  animation: "task-burst-label 1.2s ease-out forwards",
                  letterSpacing: 0.5,
                }}
              >
                ✓ {burst.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <motion.div
        className="office-right"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: "linear", delay: 0.04 }}
      >
        <OfficeAgentPanel
          selectedAgent={selectedAgent}
          selectedDept={selectedDept}
          agents={agents}
          tasks={tasks}
          departments={departments}
          ceoIncoming={ceoIncomingCount}
          visitingAgentIds={visitingAgentIds}
          onViewAgent={onSelectAgent}
          onViewDept={onSelectDepartment}
        />
      </motion.div>

      {(selectedAgent || selectedDept) && (
        <div className="office-right-float">
          <button
            className="office-right-float__close"
            onClick={() => {
              setSelectedAgent(null);
              setSelectedDept(null);
            }}
            aria-label="Close"
          >
            ✕
          </button>
          <OfficeAgentPanel
            selectedAgent={selectedAgent}
            selectedDept={selectedDept}
            agents={agents}
            tasks={tasks}
            departments={departments}
            ceoIncoming={ceoIncomingCount}
            visitingAgentIds={visitingAgentIds}
            onViewAgent={onSelectAgent}
            onViewDept={onSelectDepartment}
          />
        </div>
      )}
    </div>
  );
}
