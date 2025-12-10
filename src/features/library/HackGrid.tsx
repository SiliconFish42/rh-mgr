import { invoke } from "@tauri-apps/api/core";
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

interface HackGridProps {
  hacks: Hack[];
  loading?: boolean;
  onHackSelect?: (hack: Hack | null) => void;
}

export function HackGrid({ hacks, loading, onHackSelect }: HackGridProps) {
  const handleHackClick = (hack: Hack) => {
    if (onHackSelect) {
      onHackSelect(hack);
    }
  };

  async function launchHack(hack: Hack) {
    if (!hack.file_path) {
      alert("This hack hasn't been patched yet. Please patch it first.");
      return;
    }
    
    try {
      await invoke("launch_hack", { filePath: hack.file_path });
    } catch (error: any) {
      // Tauri errors can be in different formats
      const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || "Unknown error";
      console.error("Failed to launch hack:", error);
      alert(`Failed to launch hack: ${errorMsg}`);
    }
  }

  async function patchHack(hack: Hack) {
    if (!hack.download_url || !hack.api_id) {
      alert("This hack doesn't have a download URL available.");
      return;
    }
    
    try {
      await invoke("patch_rom", { 
        apiId: hack.api_id,
        downloadUrl: hack.download_url 
      });
      alert("Patch applied successfully! The hack is now available in your library.");
      // Reload the hacks to show updated status
      window.location.reload();
    } catch (error: any) {
      // Tauri errors can be in different formats
      const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || "Unknown error";
      console.error("Failed to patch hack:", error);
      alert(`Failed to patch hack: ${errorMsg}`);
    }
  }

  function parseJsonField<T>(field: string | null | undefined, defaultVal: T): T {
    if (!field) return defaultVal;
    try {
      return JSON.parse(field) as T;
    } catch {
      return defaultVal;
    }
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {hacks.map((hack) => {
        const authors = parseJsonField<Array<{ name: string }>>(hack.authors, []);
        const authorNames = authors.map(a => a.name).join(", ") || "Unknown author";
        const images = parseJsonField<string[]>(hack.images, []);
        const imageUrl = images.length > 0 ? images[0] : null;
        
        return (
          <div
            key={hack.id}
            className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary transition-colors cursor-pointer flex flex-col"
            onClick={() => handleHackClick(hack)}
          >
            {/* Image */}
            <div className="w-full bg-secondary flex items-center justify-center overflow-hidden" style={{ aspectRatio: '8/7' }}>
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={hack.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="text-muted-foreground text-sm">No image</div>
              )}
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-lg flex-1">{hack.name}</h3>
                <CompletionBadge hackId={hack.id} />
              </div>
              <p className="text-sm text-muted-foreground mb-2">by {authorNames}</p>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                {hack.description || "No description available."}
              </p>

              {/* Stats */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{hack.rating?.toFixed(1) || "N/A"}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDownloads(hack.downloads)} downloads
                </span>
              </div>

              {/* Type and Difficulty Tags */}
              <div className="mb-3 flex flex-wrap gap-2">
                {hack.hack_type && (
                  <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {hack.hack_type}
                  </span>
                )}
                {hack.difficulty && (
                  <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(hack.difficulty)}`}>
                    {hack.difficulty}
                  </span>
                )}
              </div>

              {/* Action Button */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  if (hack.file_path) {
                    launchHack(hack);
                  } else if (hack.download_url) {
                    patchHack(hack);
                  } else {
                    // If no file_path or download_url, just select the hack to view details
                    handleHackClick(hack);
                  }
                }}
                className="w-full"
                size="sm"
                variant={hack.file_path ? "outline" : "default"}
                disabled={!hack.file_path && !hack.download_url && !onHackSelect}
              >
                {hack.file_path ? "Launch" : hack.download_url ? "Get & Patch" : "View Details"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
