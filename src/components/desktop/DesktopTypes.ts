import type { ReactNode } from "react";
import type { CompanySettings, WSEventType } from "../../types";
import type { OAuthCallbackResult } from "../../app/types";

export interface DesktopProps {
  connected: boolean;
  on: (event: WSEventType, handler: (payload: unknown) => void) => () => void;
  onSaveSettings: (settings: CompanySettings) => Promise<void>;
  onRefreshCli: () => Promise<void>;
  oauthResult: OAuthCallbackResult | null;
  onOauthResultClear: () => void;
  onAgentsChange: () => void;
  onProjectCreate: () => void;
  onOpenDecisionInbox: () => void;
  children?: ReactNode;
}

export type TrashedProject = {
  id: string;
  name: string;
  project_path: string;
  core_goal: string;
  category_id: string | null;
  deletedAt: number;
};

export type TrashedFeature = {
  id: string;
  name: string;
  icon_svg: string | null;
  deletedAt: number;
};

export type RunProjectInfo = {
  projectId: string;
  projectName: string;
  projectPath: string;
};
