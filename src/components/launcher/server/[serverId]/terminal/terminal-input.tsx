import { KeyboardEvent, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";

interface TerminalInputProps {
    onSubmit: (command: string) => void;
    placeholder?: string;
    className?: string;
}

function TerminalInput({ onSubmit, placeholder = "输入命令...", className }: TerminalInputProps) {
    const [value, setValue] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = () => {
        const trimmed = value.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
        setHistory((prev) => [...prev, trimmed]);
        setHistoryIndex(-1);
        setValue("");
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSubmit();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (history.length === 0) return;
            const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
            setHistoryIndex(newIndex);
            setValue(history[newIndex]);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (historyIndex === -1) return;
            const newIndex = historyIndex + 1;
            if (newIndex >= history.length) {
                setHistoryIndex(-1);
                setValue("");
            } else {
                setHistoryIndex(newIndex);
                setValue(history[newIndex]);
            }
        }
    };

    return (
        <div
            className={cn("flex items-center gap-2 border-t border-border bg-background px-4 py-2", className)}
            onClick={() => inputRef.current?.focus()}>
            <ChevronRightIcon className="size-4 shrink-0 text-primary" />
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                spellCheck={false}
                autoComplete="off"
                className="flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
            />
        </div>
    );
}

export { TerminalInput };

