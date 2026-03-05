const BASE = "";

export interface CostAlertConfig {
  [provider: string]: { alertThreshold: number; enabled: boolean };
}

export async function getCostAlerts(): Promise<CostAlertConfig> {
  const res = await fetch(`${BASE}/api/cost-alerts`);
  const data = await res.json();
  return data.config ?? {};
}

export async function saveCostAlerts(config: CostAlertConfig): Promise<void> {
  await fetch(`${BASE}/api/cost-alerts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}
