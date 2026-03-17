export interface CliInstallJob {
  status: "running" | "success" | "failed";
  logs: string[];
  exitCode: number | null;
}

export async function startCliInstall(provider: string): Promise<string> {
  const res = await fetch("/api/cli-install", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Install failed");
  return data.jobId as string;
}

export async function pollCliInstall(jobId: string): Promise<CliInstallJob> {
  const res = await fetch(`/api/cli-install/${jobId}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Poll failed");
  return { status: data.status, logs: data.logs, exitCode: data.exitCode };
}
