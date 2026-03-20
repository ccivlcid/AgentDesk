export interface CliWindowProps {
  /** 에이전트별 독립 창일 때 agentId 전달. 없으면 일반 범용 터미널 */
  agentId?: string;
  onClose?: () => void;
}
