import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteHackDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (deleteCompletions: boolean) => void;
    hackName: string;
}

export function DeleteHackDialog({ isOpen, onClose, onConfirm, hackName }: DeleteHackDialogProps) {
    const [deleteCompletions, setDeleteCompletions] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
                <div className="flex items-center gap-3 text-destructive">
                    <div className="p-2 bg-destructive/10 rounded-full">
                        <Trash2 className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-semibold">Delete Hack</h2>
                </div>

                <div className="space-y-3">
                    <p className="text-muted-foreground">
                        Are you sure you want to delete <span className="font-semibold text-foreground">{hackName}</span>?
                    </p>

                    <div className="p-3 bg-secondary/50 rounded-md border border-border text-sm space-y-2">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">This action will verify and delete the patched ROM file from your disk. This cannot be undone.</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <input
                            type="checkbox"
                            id="delete-completions"
                            checked={deleteCompletions}
                            onChange={(e) => setDeleteCompletions(e.target.checked)}
                            className="rounded border-input bg-background text-primary focus:ring-primary"
                        />
                        <label
                            htmlFor="delete-completions"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none"
                        >
                            Also delete all completion data
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => onConfirm(deleteCompletions)}
                    >
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}
