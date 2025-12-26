import { useState, useEffect, useRef } from "react";
import { invoke } from '@tauri-apps/api/core';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Play, Wrench, Trash2, Check, Plus, Edit2, X } from "lucide-react";
import { useHackCompletions } from "@/hooks/useCompletions";
import { DeleteHackDialog } from "@/components/DeleteHackDialog";

interface Hack {
  id: number;
  name: string;
  file_path?: string | null;
  api_id?: string | null;
  authors?: string | null;
  release_date?: number | null;
  description?: string | null;
  images?: string | null;
  tags?: string | null;
  rating?: number | null;
  downloads?: number | null;
  difficulty?: string | null;
  hack_type?: string | null;
  download_url?: string | null;
  readme?: string | null;
}

interface LevelTiming {
  level_id: number;
  seconds: number;
}

interface HackStats {
  total_play_time_seconds: number;
  session_count: number;
  level_timings: LevelTiming[];
}

interface HackDetailsProps {
  hack: Hack;
  onClose: () => void;
  onLaunch: (hack: Hack) => void;
  onPatch?: (hack: Hack) => void;
  onRemove?: (hack: Hack, deleteCompletions: boolean) => void;
  isPatching?: boolean;
}

export function HackDetails({ hack, onClose, onLaunch, onPatch, onRemove, isPatching = false }: HackDetailsProps) {
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'readme'>('description');
  const [stats, setStats] = useState<HackStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await invoke<HackStats>('get_hack_stats', { hackId: hack.id });
        setStats(res);
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [hack.id]);

  // Completions
  const { completions, loading: completionsLoading, createCompletion, updateCompletion, deleteCompletion } = useHackCompletions(hack.id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formRoute, setFormRoute] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formHours, setFormHours] = useState("");
  const [formMinutes, setFormMinutes] = useState("");

  function parseJsonField<T>(field: string | null | undefined, defaultVal: T): T {
    if (!field) return defaultVal;
    try {
      return JSON.parse(field) as T;
    } catch {
      return defaultVal;
    }
  }

  const authors = parseJsonField<Array<{ name: string }>>(hack.authors, []);
  const authorNames = authors.map(a => a.name).join(", ") || "Unknown author";
  const images = parseJsonField<string[]>(hack.images, []);
  const tags = parseJsonField<string[]>(hack.tags, []);

  // Reset to first image when hack changes
  useEffect(() => {
    setSelectedScreenshotIndex(0);
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = 0;
    }
    // Default to readme if no description, otherwise description
    if (!hack.description && hack.readme) {
      setActiveTab('readme');
    } else {
      setActiveTab('description');
    }
  }, [hack.id, hack.description, hack.readme]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Mouse wheel handler
  const handleWheel = (e: React.WheelEvent) => {
    if (!carouselRef.current) return;
    e.preventDefault();
    carouselRef.current.scrollLeft += e.deltaY;
  };

  function formatDate(timestamp: number | null | undefined): string {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp * 1000);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  function formatPlayTime(seconds: number | null | undefined): string {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  function parsePlayTime(hours: string, minutes: string): number | null {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    if (h === 0 && m === 0) return null;
    return h * 3600 + m * 60;
  }

  function resetForm() {
    setFormRoute("");
    setFormDate("");
    setFormHours("");
    setFormMinutes("");
    setShowAddForm(false);
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRoute.trim()) return;

    try {
      const completedAt = formDate ? Math.floor(new Date(formDate).getTime() / 1000) : null;
      const playTimeSeconds = parsePlayTime(formHours, formMinutes);

      if (editingId) {
        await updateCompletion({
          id: editingId,
          completed_at: completedAt,
          play_time_seconds: playTimeSeconds,
        });
      } else {
        await createCompletion({
          hack_id: hack.id,
          route: formRoute.trim(),
          completed_at: completedAt,
          play_time_seconds: playTimeSeconds,
        });
      }
      resetForm();
    } catch (error: any) {
      alert(error?.message || "Failed to save completion");
    }
  }

  function startEdit(completion: typeof completions[0]) {
    setEditingId(completion.id);
    setFormRoute(completion.route);
    setFormDate(completion.completed_at ? formatDate(completion.completed_at) : "");
    if (completion.play_time_seconds) {
      const hours = Math.floor(completion.play_time_seconds / 3600);
      const minutes = Math.floor((completion.play_time_seconds % 3600) / 60);
      setFormHours(hours.toString());
      setFormMinutes(minutes.toString());
    } else {
      setFormHours("");
      setFormMinutes("");
    }
    setShowAddForm(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this completion?")) return;
    try {
      await deleteCompletion(id);
    } catch (error: any) {
      alert(error?.message || "Failed to delete completion");
    }
  }

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  function handleConfirmDelete(deleteCompletions: boolean) {
    if (onRemove) {
      onRemove(hack, deleteCompletions);
    }
    setShowDeleteDialog(false);
  }

  const mainImage = images.length > 0 ? images[selectedScreenshotIndex] : null;
  const isPatched = !!hack.file_path;

  return (
    <div className="h-full flex flex-col">
      <DeleteHackDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        hackName={hack.name}
      />
      {/* Header Bar */}
      <div className="relative flex items-center justify-center px-6 py-4 border-b border-border flex-shrink-0">
        <Button
          onClick={onClose}
          variant="ghost"
          className="absolute left-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-xl font-semibold">{hack.name}</h1>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-8 p-8">
          {/* Left Column */}
          <div className="w-[40%] space-y-6">
            {/* Banner Image */}
            {mainImage && (
              <div className="w-full rounded-lg overflow-hidden border border-border bg-secondary flex items-center justify-center" style={{ aspectRatio: '8/7' }}>
                <img
                  src={mainImage}
                  alt={hack.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {hack.file_path ? (
                <Button onClick={() => onLaunch(hack)} size="lg" className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Launch Hack
                </Button>
              ) : (
                <Button
                  onClick={() => onPatch?.(hack)}
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={!onPatch || isPatching}
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  {isPatching ? "Patching..." : "Patch ROM"}
                </Button>
              )}
              {onRemove && (
                <Button onClick={() => setShowDeleteDialog(true)} variant="outline" size="lg" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              )}
              {stats && stats.session_count > 0 && (
                <Button
                  onClick={() => {
                    const confirmed = window.confirm("Clear all tracking data for this hack? This cannot be undone.");
                    if (!confirmed) return;

                    invoke("clear_hack_stats", { hackId: hack.id })
                      .then(() => setStats(null))
                      .catch((e) => alert(`Error: ${e}`));
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                >
                  Clear Tracking Data
                </Button>
              )}
            </div>

            {/* Screenshots */}
            {images.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Screenshots</h3>
                <div
                  ref={carouselRef}
                  className="flex gap-2 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onWheel={handleWheel}
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {images.map((imageUrl, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        // Only select if we're not dragging
                        if (!isDragging) {
                          setSelectedScreenshotIndex(i);
                        }
                      }}
                      className={`flex-shrink-0 rounded overflow-hidden border-2 transition-colors bg-secondary flex items-center justify-center ${i === selectedScreenshotIndex
                        ? 'border-primary'
                        : 'border-border hover:border-primary/50'
                        }`}
                      style={{ width: '128px', aspectRatio: '8/7' }}
                    >
                      <img
                        src={imageUrl}
                        alt={`Screenshot ${i + 1}`}
                        className="w-full h-full object-cover pointer-events-none"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </button>
                  ))}
                </div>
                <style>{`
                  .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="flex-1 space-y-6">
            {/* Status Badge */}
            {isPatched && (
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="font-semibold">PATCHED</span>
              </div>
            )}

            {/* Title */}
            <h2 className="text-4xl font-bold">{hack.name}</h2>

            {/* Game Details */}
            <div className="space-y-2">
              <div className="flex">
                <span className="font-semibold w-32">Author:</span>
                <span className="text-muted-foreground">{authorNames}</span>
              </div>
              {hack.difficulty && (
                <div className="flex">
                  <span className="font-semibold w-32">Difficulty:</span>
                  <span className="text-muted-foreground">{hack.difficulty}</span>
                </div>
              )}
              {hack.release_date && (
                <div className="flex">
                  <span className="font-semibold w-32">Release Date:</span>
                  <span className="text-muted-foreground">{formatDate(hack.release_date)}</span>
                </div>
              )}
            </div>

            {/* Rating */}
            {hack.rating && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${star <= Math.floor(hack.rating!)
                        ? 'fill-yellow-400 text-yellow-400'
                        : star === Math.ceil(hack.rating!) && hack.rating! % 1 > 0
                          ? 'fill-yellow-400/50 text-yellow-400/50'
                          : 'text-muted-foreground'
                        }`}
                    />
                  ))}
                </div>
                <span className="font-medium">{hack.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({hack.downloads?.toLocaleString() || 0} reviews)</span>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
                {hack.hack_type && (
                  <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                    {hack.hack_type}
                  </span>
                )}
                {hack.difficulty && (
                  <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                    {hack.difficulty}
                  </span>
                )}
              </div>
            )}

            {/* Description / Readme Tabs */}
            {(hack.description || hack.readme) && (
              <div className="space-y-4">
                {hack.readme ? (
                  <div className="flex border-b border-border">
                    <button
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${!activeTab || activeTab === 'description'
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      onClick={() => setActiveTab('description')}
                    >
                      Description
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'readme'
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      onClick={() => setActiveTab('readme')}
                    >
                      Readme
                    </button>
                  </div>
                ) : (
                  <h3 className="text-lg font-semibold border-b border-border pb-2">Description</h3>
                )}

                {(!activeTab || activeTab === 'description') && hack.description && (
                  <div
                    className="space-y-3 text-muted-foreground leading-relaxed [&>p]:mb-2 last:[&>p]:mb-0"
                    dangerouslySetInnerHTML={{ __html: hack.description }}
                  />
                )}

                {activeTab === 'readme' && hack.readme && (
                  <div className="bg-muted/50 p-4 rounded-md overflow-auto max-h-[400px]">
                    <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                      {hack.readme}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Playtime Stats */}
            <div className="space-y-4 border-t border-border pt-6">
              <h3 className="text-lg font-semibold">Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary rounded-lg border border-border text-center">
                  <div className="text-sm text-muted-foreground mb-1">Total Play Time</div>
                  <div className="text-2xl font-bold">{formatPlayTime(stats?.total_play_time_seconds)}</div>
                </div>
                <div className="p-4 bg-secondary rounded-lg border border-border text-center">
                  <div className="text-sm text-muted-foreground mb-1">Sessions</div>
                  <div className="text-2xl font-bold">{stats?.session_count || 0}</div>
                </div>
              </div>

              {stats?.level_timings && stats.level_timings.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Level Breakdown</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm max-h-40 overflow-y-scroll pr-2">
                    {stats.level_timings.map(l => (
                      <div key={l.level_id} className="flex justify-between p-2 bg-secondary rounded border border-border">
                        <span>Level {l.level_id}</span>
                        <span className="font-mono">{formatPlayTime(l.seconds)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Completions Section */}
            <div className="space-y-4 border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Completions</h3>
                {!showAddForm && (
                  <Button
                    onClick={() => setShowAddForm(true)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Completion
                  </Button>
                )}
              </div>

              {/* Add/Edit Form */}
              {showAddForm && (
                <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-secondary rounded-lg border border-border">
                  <div>
                    <label className="block text-sm font-medium mb-1">Route *</label>
                    <input
                      type="text"
                      value={formRoute}
                      onChange={(e) => setFormRoute(e.target.value)}
                      placeholder="e.g., Any%, 100%, Low%"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Completion Date (optional)</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Hours (optional)</label>
                      <input
                        type="number"
                        min="0"
                        value={formHours}
                        onChange={(e) => setFormHours(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Minutes (optional)</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={formMinutes}
                        onChange={(e) => setFormMinutes(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      {editingId ? "Update" : "Add"} Completion
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={resetForm}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* Completions List */}
              {completionsLoading ? (
                <p className="text-sm text-muted-foreground">Loading completions...</p>
              ) : completions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completions recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {completions.map((completion) => (
                    <div
                      key={completion.id}
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{completion.route}</div>
                        <div className="text-sm text-muted-foreground space-x-4">
                          {completion.completed_at && (
                            <span>Completed: {formatDate(completion.completed_at)}</span>
                          )}
                          {completion.play_time_seconds && (
                            <span>Time: {formatPlayTime(completion.play_time_seconds)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => startEdit(completion)}
                          size="sm"
                          variant="ghost"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(completion.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

