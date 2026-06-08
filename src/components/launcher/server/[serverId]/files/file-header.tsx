import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeftIcon, FolderPlusIcon, FilePlusIcon, HomeIcon } from "lucide-react";

interface FileHeaderProps {
    path: string;
    pathComponents: string[];
    onBack?: () => void;
    onNavigateRoot?: () => void;
    onNavigateTo?: (index: number) => void;
    onNewFolder?: () => void;
    onNewFile?: () => void;
    className?: string;
}

function FileHeader({
    path: _path,
    pathComponents,
    onBack,
    onNavigateRoot,
    onNavigateTo,
    onNewFolder,
    onNewFile,
    className,
}: FileHeaderProps) {
    const canGoBack = pathComponents.length > 0;

    return (
        <div className={cn("flex items-center justify-between border-b border-border bg-card px-4 py-2", className)}>
            <div className="flex min-w-0 items-center gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" onClick={onBack} disabled={!canGoBack}>
                            <ChevronLeftIcon className="size-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>返回上级</TooltipContent>
                </Tooltip>

                <div className="flex min-w-0 items-center gap-1 overflow-hidden text-xs text-muted-foreground">
                    <Button variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={onNavigateRoot}>
                        <HomeIcon className="mr-1 size-3.5" />
                        根目录
                    </Button>

                    {pathComponents.map((component, index) => (
                        <div key={index} className="flex shrink-0 items-center">
                            <span className="mx-1">/</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 max-w-30 truncate px-1 text-xs"
                                onClick={() => onNavigateTo?.(index)}>
                                {component}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" onClick={onNewFolder}>
                            <FolderPlusIcon className="size-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>创建文件夹</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" onClick={onNewFile}>
                            <FilePlusIcon className="size-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>创建文件</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}

export { FileHeader };
