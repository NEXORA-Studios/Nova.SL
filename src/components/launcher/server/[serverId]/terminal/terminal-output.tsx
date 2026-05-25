import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TerminalLine {
    id: string;
    text: string;
    type?: "info" | "warn" | "error" | "success" | "input" | "default";
    timestamp?: string;
}

interface TerminalOutputProps {
    lines: TerminalLine[];
    className?: string;
}

const lineTypeStyles: Record<NonNullable<TerminalLine["type"]>, string> = {
    info: "text-blue-400",
    warn: "text-yellow-400",
    error: "text-red-400",
    success: "text-green-400",
    input: "text-foreground",
    default: "text-muted-foreground",
};

function TerminalOutput({ lines, className }: TerminalOutputProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [lines]);

    return (
        <div
            ref={scrollRef}
            className={cn("flex-1 overflow-auto font-mono text-sm leading-relaxed p-4", className)}>
            {lines.map((line) => (
                <div key={line.id} className={cn("flex gap-3 whitespace-pre-wrap break-all", lineTypeStyles[line.type ?? "default"])}>
                    {line.timestamp && (
                        <span className="shrink-0 text-muted-foreground/50 select-none">{line.timestamp}</span>
                    )}
                    <span>{line.text}</span>
                </div>
            ))}
        </div>
    );
}

export { TerminalOutput };
