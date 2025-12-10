import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { CompletionBadge } from "@/components/CompletionBadge";

interface Hack {
  id: number;
  name: string;
  file_path?: string | null;
  api_id?: string | null;
  authors?: string | null; // JSON array
  release_date?: number | null; // UNIX timestamp
  description?: string | null;
  images?: string | null; // JSON array
  tags?: string | null; // JSON array
  rating?: number | null;
  downloads?: number | null;
  difficulty?: string | null;
  hack_type?: string | null;
  download_url?: string | null;
}

interface HackListProps {
  hacks: Hack[];
  loading?: boolean;
  onHackSelect?: (hack: Hack | null) => void;
  onLaunch?: (hack: Hack) => void;
  onPatch?: (hack: Hack) => void;
  isPatching?: boolean;
}

export function HackList({ hacks, loading, onHackSelect, onLaunch, onPatch, isPatching = false }: HackListProps) {
  const handleHackClick = (hack: Hack) => {
    if (onHackSelect) {
      onHackSelect(hack);
    }
  };

  function parseJsonField<T>(field: string | null | undefined, defaultVal: T): T {
    if (!field) return defaultVal;
    try {
      return JSON.parse(field) as T;
    } catch {
      return defaultVal;
    }
  }

  function formatDate(timestamp: number | null | undefined): string {
    if (!timestamp) return "Unknown date";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  }

  function formatDownloads(downloads: number | null | undefined): string {
    if (!downloads) return "0";
    if (downloads >= 1000) {
      return `${(downloads / 1000).toFixed(1)}k`;
    }
    return downloads.toString();
  }

  function getDifficultyColor(difficulty: string | null | undefined): string {
    if (!difficulty) return "bg-muted";
    const diff = difficulty.toLowerCase();
    if (diff.includes("easy") || diff.includes("newcomer") || diff.includes("casual")) {
      return "bg-green-500/20 text-green-400 border border-green-500/30";
    }
    if (diff.includes("normal") || diff.includes("intermediate")) {
      return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    }
    if (diff.includes("hard") || diff.includes("advanced") || diff.includes("expert")) {
      return "bg-red-500/20 text-red-400 border border-red-500/30";
    }
    if (diff.includes("kaizo") || diff.includes("master") || diff.includes("grandmaster")) {
      return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
    }
    return "bg-muted";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (hacks.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No hacks found</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-4 font-semibold text-sm">Name</th>
            <th className="text-left p-4 font-semibold text-sm">Author</th>
            <th className="text-left p-4 font-semibold text-sm">Rating</th>
            <th className="text-left p-4 font-semibold text-sm">Type</th>
            <th className="text-left p-4 font-semibold text-sm">Difficulty</th>
            <th className="text-left p-4 font-semibold text-sm">Downloads</th>
            <th className="text-left p-4 font-semibold text-sm">Release Date</th>
            <th className="text-right p-4 font-semibold text-sm">Action</th>
          </tr>
        </thead>
        <tbody>
          {hacks.map((hack) => {
            const authors = parseJsonField<Array<{ name: string }>>(hack.authors, []);
            const authorNames = authors.map(a => a.name).join(", ") || "Unknown author";

            return (
              <tr
                key={hack.id}
                className="border-t border-border hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleHackClick(hack)}
              >
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{hack.name}</div>
                    <CompletionBadge hackId={hack.id} />
                  </div>
                  {hack.description && (
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {hack.description}
                    </div>
                  )}
                </td>
                <td className="p-4 text-sm text-muted-foreground">{authorNames}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{hack.rating?.toFixed(1) || "N/A"}</span>
                  </div>
                </td>
                <td className="p-4">
                  {hack.hack_type && (
                    <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {hack.hack_type}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {hack.difficulty && (
                    <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(hack.difficulty)}`}>
                      {hack.difficulty}
                    </span>
                  )}
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {formatDownloads(hack.downloads)}
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {formatDate(hack.release_date)}
                </td>
                <td className="p-4">
                  <div className="flex justify-end">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hack.file_path && onLaunch) {
                          onLaunch(hack);
                        } else if (hack.download_url && onPatch) {
                          onPatch(hack);
                        } else {
                          handleHackClick(hack);
                        }
                      }}
                      size="sm"
                      variant={hack.file_path ? "outline" : "default"}
                      disabled={(!hack.file_path && !hack.download_url && !onHackSelect) || (!!hack.download_url && !hack.file_path && isPatching)}
                    >
                      {hack.file_path ? "Launch" : hack.download_url ? (isPatching && !hack.file_path ? "Patching..." : "Get & Patch") : "View Details"}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

