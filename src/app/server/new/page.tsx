import { useNavigate } from "react-router";
import { PlusIcon, ArrowLeftIcon, FileArchiveIcon, HardDriveIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function NewServerPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold">创建服务器实例</h1>
                <p className="mt-1 text-sm text-muted-foreground">选择一种方式添加 Minecraft 服务器到 Nova.SL</p>
            </div>

            <div className="flex flex-col gap-4">
                {/* 创建新服务器 */}
                <div className="space-y-3">
                    <h2 className="text-base font-semibold">创建新服务器</h2>
                    <p className="text-xs text-muted-foreground">
                        适用于本地没有压缩包或服务器目录的情况。
                        从零开始创建一个新的服务器，选择核心类型和版本，自动下载并配置。
                    </p>
                    <Card
                        className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                        onClick={() => navigate("/server/new/create")}>
                        <CardContent className="flex items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <PlusIcon className="size-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">下载并创建实例</h3>
                                <p className="text-xs text-muted-foreground">支持目前主流原版、模组和插件核心及对应版本</p>
                                <div className="flex items-center gap-1 text-xs text-primary">
                                    进入向导 <ArrowLeftIcon className="size-3 rotate-180" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                {/* 其他创建方式 */}
                <div className="space-y-3">
                    <h2 className="text-base font-semibold">其他创建方式</h2>
                    <p className="text-xs text-muted-foreground">
                        适用于本地已有压缩包、或已有服务器目录需<strong>直接托管</strong>
                        等场景。导入或托管后将进入与「一键下载」完成相同的<strong>创建向导</strong>。
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <Card
                            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                            onClick={() => navigate("/server/new/import")}>
                            <CardContent className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <FileArchiveIcon className="size-5" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold">导入服务器核心或压缩包</h3>
                                    <p className="text-xs text-muted-foreground">支持 JAR、ZIP 等格式的服务器文件</p>
                                    <div className="flex items-center gap-1 text-xs text-primary">
                                        进入向导 <ArrowLeftIcon className="size-3 rotate-180" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card
                            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                            onClick={() => navigate("/server/new/import")}>
                            <CardContent className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <HardDriveIcon className="size-5" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold">托管已有服务器</h3>
                                    <p className="text-xs text-muted-foreground">
                                        选择本机上的服务器工作目录，由本应用直接托管
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-primary">
                                        进入向导 <ArrowLeftIcon className="size-3 rotate-180" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NewServerPage;
