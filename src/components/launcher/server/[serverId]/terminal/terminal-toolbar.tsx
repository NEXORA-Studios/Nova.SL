import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { CopyIcon, Trash2Icon } from "lucide-react";

interface TerminalToolbarProps {
    onClear?: () => void;
    onCopy?: () => void;
    className?: string;
}

function TerminalToolbar({ onClear, onCopy, className }: TerminalToolbarProps) {
    return (
        <div className={cn("flex items-center gap-1 border-b border-border bg-background px-4 py-1.5", className)}>
            <Button variant="ghost" size="sm" onClick={onCopy} className="ml-auto">
                <CopyIcon className="size-3.5" />
                复制全部输出
            </Button>
            <Button variant="destructive" size="sm" onClick={onClear}>
                <Trash2Icon className="size-3.5" />
                清空输出
            </Button>
        </div>
    );
}

export { TerminalToolbar };
