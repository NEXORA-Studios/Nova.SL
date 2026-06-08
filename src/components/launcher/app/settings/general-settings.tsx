import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfigStore } from "@/stores/config";
import { useTheme } from "next-themes";
import { LaptopIcon, MoonIcon, PaintbrushIcon, SunIcon, FileCodeIcon, TerminalIcon } from "lucide-react";

function GeneralSettings() {
    const config = useConfigStore((s) => s.config);
    const loaded = useConfigStore((s) => s.loaded);
    const load = useConfigStore((s) => s.load);
    const setThemeConfig = useConfigStore((s) => s.setTheme);
    const setDefaultEditor = useConfigStore((s) => s.setDefaultEditor);
    const setCustomStartCommand = useConfigStore((s) => s.setCustomStartCommand);
    const { setTheme } = useTheme();

    useEffect(() => {
        if (!loaded) load();
    }, [loaded, load]);

    const handleThemeChange = async (theme: "light" | "dark" | "system") => {
        await setThemeConfig(theme);
        setTheme(theme);
    };

    const handleEditorChange = async (editor: "internal" | "custom") => {
        await setDefaultEditor(editor);
    };

    const handleCommandChange = async (command: string) => {
        await setCustomStartCommand(command);
    };

    if (!config) return null;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <PaintbrushIcon className="size-4 text-primary" />
                        <CardTitle>外观设置</CardTitle>
                    </div>
                    <CardDescription>自定义应用程序的主题和界面显示风格</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>界面主题</Label>
                            <p className="text-xs text-muted-foreground">选择应用程序的深浅色外观主题</p>
                        </div>
                        <Select value={config.ui.theme} onValueChange={handleThemeChange}>
                            <SelectTrigger className="w-45">
                                <SelectValue placeholder="选择主题" />
                            </SelectTrigger>
                            <SelectContent position="popper">
                                <SelectItem value="light">
                                    <SunIcon className="size-4" />
                                    浅色
                                </SelectItem>
                                <SelectItem value="dark">
                                    <MoonIcon className="size-4" />
                                    深色
                                </SelectItem>
                                <SelectItem value="system">
                                    <LaptopIcon className="size-4" />
                                    跟随系统主题
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pt-2">
                    <div className="flex items-center gap-2">
                        <FileCodeIcon className="size-4 text-primary" />
                        <CardTitle>编辑器设置</CardTitle>
                    </div>
                    <CardDescription>配置文件编辑器的默认打开方式</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>默认编辑器</Label>
                            <p className="text-xs text-muted-foreground">选择打开文本文件时使用的编辑器</p>
                        </div>
                        <Select value={config.ui.editor.default_editor} onValueChange={handleEditorChange}>
                            <SelectTrigger className="w-45">
                                <SelectValue placeholder="选择编辑器" />
                            </SelectTrigger>
                            <SelectContent position="popper">
                                <SelectItem value="internal">
                                    <FileCodeIcon className="size-4" />
                                    内置编辑器
                                </SelectItem>
                                <SelectItem value="custom">
                                    <TerminalIcon className="size-4" />
                                    自定义外部编辑器
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {config.ui.editor.default_editor === "custom" && (
                        <div className="space-y-2">
                            <div className="space-y-0.5">
                                <Label>启动命令</Label>
                                <p className="text-xs text-muted-foreground">
                                    使用 %file% 作为文件路径占位符，例如: code %file%
                                </p>
                            </div>
                            <Input
                                value={config.ui.editor.custom_start_command}
                                onChange={(e) => handleCommandChange(e.target.value)}
                                placeholder="code %file%"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}

export { GeneralSettings };
