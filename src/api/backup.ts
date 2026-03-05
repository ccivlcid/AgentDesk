const BASE = "";

export async function downloadBackup(): Promise<void> {
  const res = await fetch(`${BASE}/api/backup`);
  if (!res.ok) throw new Error("Backup download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agentdesk-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function restoreBackup(file: File): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${BASE}/api/backup/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: file,
  });
  return res.json();
}

export async function exportTasksCsv(): Promise<void> {
  const res = await fetch(`${BASE}/api/tasks/export?format=csv`);
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportTasksJson(): Promise<void> {
  const res = await fetch(`${BASE}/api/tasks/export?format=json`);
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tasks-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
