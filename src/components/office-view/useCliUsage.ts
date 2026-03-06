import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { getCliStatus, getCliUsage, refreshCliUsage, type CliUsageEntry } from "../../api";
import type { Task, CliStatusMap } from "../../types";

interface UseCliUsageResult {
  cliStatus: CliStatusMap | null;
  cliUsage: Record<string, CliUsageEntry> | null;
  cliUsageRef: MutableRefObject<Record<string, CliUsageEntry> | null>;
  refreshing: boolean;
  handleRefreshUsage: () => void;
}

/** currentView: CLI 사용량 화면에 들어올 때마다 cli-status 재조회하기 위해 사용 */
export function useCliUsage(tasks: Task[], currentView?: string): UseCliUsageResult {
  const [cliStatus, setCliStatus] = useState<CliStatusMap | null>(null);
  const [cliUsage, setCliUsage] = useState<Record<string, CliUsageEntry> | null>(null);
  const cliUsageRef = useRef<Record<string, CliUsageEntry> | null>(null);
  cliUsageRef.current = cliUsage;

  const [refreshing, setRefreshing] = useState(false);
  const doneCountRef = useRef(0);

  useEffect(() => {
    getCliStatus()
      .then(setCliStatus)
      .catch(() => {});
    getCliUsage()
      .then((response) => {
        if (response.ok) setCliUsage(response.usage);
      })
      .catch(() => {});
  }, []);

  // CLI 사용량 탭에 들어올 때마다 서버에서 최신 cli-status 재조회 (실제 연동 상태 반영)
  useEffect(() => {
    if (currentView === "cli-usage") {
      getCliStatus(true)
        .then(setCliStatus)
        .catch(() => {});
    }
  }, [currentView]);

  useEffect(() => {
    const doneCount = tasks.filter((task) => task.status === "done").length;
    if (doneCountRef.current > 0 && doneCount > doneCountRef.current) {
      refreshCliUsage()
        .then((response) => {
          if (response.ok) setCliUsage(response.usage);
        })
        .catch(() => {});
    }
    doneCountRef.current = doneCount;
  }, [tasks]);

  const handleRefreshUsage = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    Promise.all([getCliStatus(true), refreshCliUsage()])
      .then(([status, response]) => {
        setCliStatus(status);
        if (response.ok) setCliUsage(response.usage);
      })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, [refreshing]);

  return {
    cliStatus,
    cliUsage,
    cliUsageRef,
    refreshing,
    handleRefreshUsage,
  };
}
