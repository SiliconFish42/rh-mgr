import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface HackCompletion {
  id: number;
  hack_id: number;
  route: string;
  completed_at: number | null;  // UNIX timestamp in seconds
  play_time_seconds: number | null;  // Play time in seconds
  created_at: number;
  updated_at: number;
}

export interface CompletionSummary {
  total_completions: number;
  routes: string[];
}

interface CreateCompletion {
  hack_id: number;
  route: string;
  completed_at?: number | null;
  play_time_seconds?: number | null;
}

interface UpdateCompletion {
  id: number;
  completed_at?: number | null;
  play_time_seconds?: number | null;
}

export function useHackCompletions(hackId: number | null) {
  const [completions, setCompletions] = useState<HackCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCompletions = useCallback(async () => {
    if (!hackId) {
      setCompletions([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await invoke<HackCompletion[]>("get_hack_completions", {
        hackId: hackId,
      });
      setCompletions(result);
    } catch (e: any) {
      setError(e?.message || "Failed to load completions");
      console.error("Failed to load completions:", e);
    } finally {
      setLoading(false);
    }
  }, [hackId]);

  useEffect(() => {
    loadCompletions();
  }, [loadCompletions]);

  const createCompletion = useCallback(async (data: CreateCompletion) => {
    try {
      const result = await invoke<HackCompletion>("create_completion", {
        completion: data,
      });
      await loadCompletions();
      return result;
    } catch (e: any) {
      const errorMsg = e?.message || "Failed to create completion";
      console.error("Failed to create completion:", e);
      throw new Error(errorMsg);
    }
  }, [loadCompletions]);

  const updateCompletion = useCallback(async (data: UpdateCompletion) => {
    try {
      const result = await invoke<HackCompletion>("update_completion", {
        completion: data,
      });
      await loadCompletions();
      return result;
    } catch (e: any) {
      const errorMsg = e?.message || "Failed to update completion";
      console.error("Failed to update completion:", e);
      throw new Error(errorMsg);
    }
  }, [loadCompletions]);

  const deleteCompletion = useCallback(async (id: number) => {
    try {
      await invoke("delete_completion", { id });
      await loadCompletions();
    } catch (e: any) {
      const errorMsg = e?.message || "Failed to delete completion";
      console.error("Failed to delete completion:", e);
      throw new Error(errorMsg);
    }
  }, [loadCompletions]);

  return {
    completions,
    loading,
    error,
    createCompletion,
    updateCompletion,
    deleteCompletion,
    refresh: loadCompletions,
  };
}

export function useCompletionSummary(hackId: number | null) {
  const [summary, setSummary] = useState<CompletionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (!hackId) {
      setSummary(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await invoke<CompletionSummary>("get_completion_summary", {
        hackId: hackId,
      });
      setSummary(result);
    } catch (e: any) {
      setError(e?.message || "Failed to load completion summary");
      console.error("Failed to load completion summary:", e);
    } finally {
      setLoading(false);
    }
  }, [hackId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return {
    summary,
    loading,
    error,
    refresh: loadSummary,
  };
}

