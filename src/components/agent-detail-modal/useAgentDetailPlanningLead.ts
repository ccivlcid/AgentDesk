import { useCallback, useEffect, useState } from "react";
import * as api from "../../api";
import type { I18nContextValue } from "../../i18n";
import type { Agent } from "../../types";
import { useConfirm } from "../ui/ConfirmDialog";

export interface UseAgentDetailPlanningLeadResult {
  actsAsPlanningLead: boolean;
  savingPlanningLead: boolean;
  handlePlanningLeadToggle: (nextChecked: boolean) => Promise<void>;
}

export function useAgentDetailPlanningLead(
  agent: Agent,
  onAgentUpdated: (() => void) | undefined,
  t: I18nContextValue["t"],
): UseAgentDetailPlanningLeadResult {
  const { confirm } = useConfirm();
  const [savingPlanningLead, setSavingPlanningLead] = useState(false);
  const [actsAsPlanningLead, setActsAsPlanningLead] = useState(
    Number(agent.acts_as_planning_leader ?? 0) === 1,
  );

  useEffect(() => {
    setActsAsPlanningLead(Number(agent.acts_as_planning_leader ?? 0) === 1);
  }, [agent.id, agent.acts_as_planning_leader]);

  const handlePlanningLeadToggle = useCallback(
    async (nextChecked: boolean) => {
      if (agent.role !== "team_leader" || savingPlanningLead) return;
      const previous = actsAsPlanningLead;
      setActsAsPlanningLead(nextChecked);
      setSavingPlanningLead(true);

      try {
        await api.updateAgent(agent.id, {
          acts_as_planning_leader: nextChecked ? 1 : 0,
          workflow_pack_key: "development",
        });
        onAgentUpdated?.();
      } catch (error) {
        if (
          nextChecked &&
          api.isApiRequestError(error) &&
          error.status === 409 &&
          error.code === "planning_leader_exists"
        ) {
          const details = (error.details ?? {}) as {
            existing_leader?: { name?: string | null };
          };
          const existingLeaderName = String(
            details.existing_leader?.name ||
              t({ ko: "기존 리더", en: "current leader", ja: "現在のリーダー", zh: "当前负责人" }),
          ).trim();
          const confirmed = await confirm({
            title: t({ ko: "리더 변경", en: "Change Leader?", ja: "リーダーを変更しますか？", zh: "更改负责人？" }),
            message: t({
              ko: `${existingLeaderName}이(가) 이미 리더입니다. 변경하시겠습니까?`,
              en: `${existingLeaderName} is already the leader. Change leader?`,
              ja: `${existingLeaderName} はすでにリーダーです。変更しますか？`,
              zh: `${existingLeaderName} 已是负责人，是否更改？`,
            }),
            confirmLabel: t({ ko: "변경", en: "Confirm", ja: "変更", zh: "确认" }),
            cancelLabel: t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" }),
            variant: "default",
          });
          if (confirmed) {
            try {
              await api.updateAgent(agent.id, {
                acts_as_planning_leader: 1,
                workflow_pack_key: "development",
                force_planning_leader_override: true,
              });
              onAgentUpdated?.();
              return;
            } catch (overrideError) {
              console.error("Failed to override planning lead:", overrideError);
            }
          }
        } else {
          console.error("Failed to update planning lead:", error);
        }
        setActsAsPlanningLead(previous);
      } finally {
        setSavingPlanningLead(false);
      }
    },
    [agent.id, agent.role, actsAsPlanningLead, onAgentUpdated, savingPlanningLead, t, confirm],
  );

  return {
    actsAsPlanningLead,
    savingPlanningLead,
    handlePlanningLeadToggle,
  };
}
