import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePlanner } from "@/context/PlannerContext";
import { syncGet, syncPut } from "@/lib/authApi";
import MergeDialog from "@/components/MergeDialog";
import { toast } from "sonner";

const isEmptyPlanner = (s) => {
  if (!s) return true;
  const arrKeys = ["classes", "subjects", "students", "timetable", "events", "units", "tasks", "followups", "standaloneMaterials", "daySummaries"];
  return arrKeys.every((k) => !Array.isArray(s[k]) || s[k].length === 0);
};

const STATE_KEY = "lararplanerare_v1";

/**
 * Cloud snapshot sync. On login:
 *   – if server state is empty AND local state has data → show merge dialog
 *   – if server state is present → replace local state with server state
 *   – if both empty → nothing to do
 * Subsequently, any local state change (debounced 1s) is pushed to the server.
 */
export default function CloudSync() {
  const { user } = useAuth();
  const planner = usePlanner();
  const initialSyncDone = useRef(false);
  const lastPushed = useRef(null);
  const [mergePrompt, setMergePrompt] = useState(null); // { local, remoteUpdatedAt }

  // 1. Initial sync when user becomes available
  useEffect(() => {
    initialSyncDone.current = false;
    if (!user) return;
    (async () => {
      try {
        const remote = await syncGet();
        const localRaw = localStorage.getItem(STATE_KEY);
        const local = localRaw ? JSON.parse(localRaw) : null;
        const remoteHas = remote?.state && !isEmptyPlanner(remote.state);
        const localHas = local && !isEmptyPlanner(local);

        if (remoteHas) {
          // Server is source of truth – load it into planner
          planner.importBackup(remote.state);
          lastPushed.current = JSON.stringify(remote.state);
          if (localHas && JSON.stringify(local) !== JSON.stringify(remote.state)) {
            toast.info("Din molnplanerare laddades in.");
          }
          initialSyncDone.current = true;
        } else if (localHas) {
          // No server state but local exists – ask user
          setMergePrompt({ local });
        } else {
          initialSyncDone.current = true;
        }
      } catch (e) {
        console.error("Initial sync failed", e);
        initialSyncDone.current = true;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 2. Debounced push after initial sync
  useEffect(() => {
    if (!user || !initialSyncDone.current) return;
    const t = setTimeout(async () => {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return;
      if (lastPushed.current === raw) return;
      try {
        // eslint-disable-next-line no-unused-vars
        const _ = await syncPut(JSON.parse(raw));
        lastPushed.current = raw;
      } catch (e) {
        // silent – will retry on next change
        console.error("sync push failed", e);
      }
    }, 1000);
    return () => clearTimeout(t);
    // planner state is the trigger via localStorage change – depend on all planner props
  }, [user, planner]);

  const acceptMerge = async () => {
    if (!mergePrompt) return;
    try {
      await syncPut(mergePrompt.local);
      lastPushed.current = JSON.stringify(mergePrompt.local);
      toast.success("Din planerare finns nu i molnet");
    } catch (e) {
      toast.error("Kunde inte ladda upp: " + e.message);
    } finally {
      initialSyncDone.current = true;
      setMergePrompt(null);
    }
  };

  const declineMerge = () => {
    if (!mergePrompt) return;
    // Start fresh in the cloud – clear local planner
    planner.clearAll();
    lastPushed.current = null;
    initialSyncDone.current = true;
    setMergePrompt(null);
    toast.info("Startar med en tom molnplanerare");
  };

  return (
    <MergeDialog
      open={!!mergePrompt}
      onKeep={acceptMerge}
      onStartFresh={declineMerge}
    />
  );
}
