import { useCompletionSummary } from "@/hooks/useCompletions";
import { Check } from "lucide-react";

interface CompletionBadgeProps {
  hackId: number;
  className?: string;
}

export function CompletionBadge({ hackId, className = "" }: CompletionBadgeProps) {
  const { summary, loading } = useCompletionSummary(hackId);

  if (loading || !summary || summary.total_completions === 0) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-medium ${className}`}
      title={`Completed routes: ${summary.routes.join(", ")}`}
    >
      <Check className="w-3 h-3" />
      <span>{summary.total_completions} route{summary.total_completions !== 1 ? "s" : ""}</span>
    </div>
  );
}

