import { HackDetails } from "@/features/library/HackDetails";

interface HackDetailWrapperProps {
  hack: any;
  onClose: () => void;
  onLaunch: (hack: any) => void | Promise<void>;
  onPatch: (hack: any) => void | Promise<void>;
  onRemove?: (hack: any, deleteCompletions: boolean) => void | Promise<void>;
  isPatching?: boolean;
}

export function HackDetailWrapper({
  hack,
  onClose,
  onLaunch,
  onPatch,
  onRemove,
  isPatching = false,
}: HackDetailWrapperProps) {
  return (
    <div className="h-full overflow-y-auto p-8">
      <HackDetails
        hack={hack}
        onClose={onClose}
        onLaunch={onLaunch}
        onPatch={onPatch}
        onRemove={onRemove}
        isPatching={isPatching}
      />
    </div>
  );
}

