import { SaveIcon, XIcon, AlertCircleIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Editor, EditorProps } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { readRaw, writeRaw, readText, type TextFileFormat } from "@/lib/tauri/file";

interface TextEditorProps {
    filePath: string;
    fileName: string;
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => void;
}

function InternalEditor({
    content: [content, setContent],
    format,
}: {
    content: [string, (val: string) => void];
    format: TextFileFormat | null;
}) {
    const { theme } = useTheme();
    const getTheme = () => {
        switch (theme) {
            case "dark":
                return "vs-dark";
            case "light":
                return "vs";
            case "system":
                return window.matchMedia("(prefers-color-scheme: dark)").matches ? "vs-dark" : "vs";
        }
    };

    const getMonacoLanguage = (fmt: TextFileFormat | null) => {
        switch (fmt) {
            case "json":
                return "json";
            case "toml":
                return "toml"; // Monaco don't have built-in toml but 'ini' works decent or just 'toml' if supported
            case "yaml":
                return "yaml";
            case "properties":
                return "ini"; // Properties format is very similar to ini
            default:
                return "plaintext";
        }
    };

    const LoadingComp = () => (
        <div className="flex h-full items-center justify-center text-muted-foreground">编辑器加载中...</div>
    );

    const options: EditorProps["options"] = {
        fontSize: 13,
        minimap: { showSlider: "always" },
        lineNumbers: "on",
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 12, bottom: 12 },
        fontFamily: "monospace",
        renderWhitespace: "selection",
        tabSize: 2,
        cursorSmoothCaretAnimation: "on",
    };

    return (
        <Editor
            height="100%"
            language={getMonacoLanguage(format)}
            theme={getTheme()}
            value={content}
            onChange={(val) => setContent(val ?? "")}
            loading={<LoadingComp />}
            options={options}
        />
    );
}

function TextEditor({ filePath, fileName, isOpen, onClose, onSave }: TextEditorProps) {
    const [content, setContent] = useState("");
    const [originalContent, setOriginalContent] = useState("");
    const [format, setFormat] = useState<TextFileFormat | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadFile = useCallback(async () => {
        if (!isOpen || !filePath) return;

        setIsLoading(true);
        setError(null);

        try {
            // 尝试读取并解析文件
            const { format: detectedFormat } = await readText(filePath);
            setFormat(detectedFormat);

            // 读取原始内容用于编辑
            const rawContent = await readRaw(filePath);
            setContent(rawContent);
            setOriginalContent(rawContent);
            setHasChanges(false);
        } catch (err) {
            // 如果解析失败，尝试作为纯文本读取
            try {
                const rawContent = await readRaw(filePath);
                setContent(rawContent);
                setOriginalContent(rawContent);
                setFormat("plain");
                setHasChanges(false);
            } catch (rawErr) {
                setError(`无法读取文件: ${rawErr}`);
            }
        } finally {
            setIsLoading(false);
        }
    }, [filePath, isOpen]);

    useEffect(() => {
        if (isOpen) {
            loadFile();
        }
    }, [isOpen, loadFile]);

    useEffect(() => {
        setHasChanges(content !== originalContent);
    }, [content, originalContent]);

    const handleSave = async () => {
        if (!filePath) return;

        setIsSaving(true);
        try {
            await writeRaw(filePath, content);
            setOriginalContent(content);
            setHasChanges(false);
            toast.success("文件已保存");
            onSave?.();
        } catch (err) {
            toast.error(`保存失败: ${err}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (hasChanges) {
            const confirmed = window.confirm("有未保存的更改，确定要关闭吗？");
            if (!confirmed) return;
        }
        onClose();
    };

    const getLanguageLabel = (fmt: TextFileFormat | null) => {
        switch (fmt) {
            case "json":
                return "JSON";
            case "toml":
                return "TOML";
            case "yaml":
                return "YAML";
            case "properties":
                return "Properties";
            default:
                return "文本";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="flex h-[85vh] w-[95vw]! max-w-screen! flex-col gap-0 p-0">
                <DialogHeader className="border-b px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <DialogTitle className="text-base">{fileName}</DialogTitle>
                            {format && (
                                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                    {getLanguageLabel(format)}
                                </span>
                            )}
                            {hasChanges && (
                                <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                                    已修改
                                </span>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="min-h-0 flex-1">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">加载中...</div>
                    ) : error ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-destructive">
                            <AlertCircleIcon className="size-8" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <InternalEditor content={[content, setContent]} format={format} />
                    )}
                </div>

                <DialogFooter className="gap-2 border-t px-6 py-4">
                    <Button variant="outline" onClick={handleClose} disabled={isSaving}>
                        <XIcon className="mr-1 size-4" />
                        关闭
                    </Button>
                    <Button onClick={handleSave} disabled={!hasChanges || isSaving || isLoading}>
                        {isSaving ? (
                            <>
                                <span className="mr-1 animate-spin">⏳</span>
                                保存中...
                            </>
                        ) : (
                            <>
                                <SaveIcon className="mr-1 size-4" />
                                保存
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export { TextEditor };
