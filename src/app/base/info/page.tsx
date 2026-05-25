import { GlobeIcon, BookIcon, ExternalLinkIcon } from "lucide-react";
import { SiGithub as GithubIcon } from "@icons-pack/react-simple-icons";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function InfoPage() {
    return (
        <div className="mx-auto flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold">关于 Nova.SL</h1>
                <p className="mt-1 text-sm text-muted-foreground">了解 Nova.SL 的版本信息、开发团队以及开源协议</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
                            NS
                        </div>
                        <div>
                            <CardTitle className="text-xl">Nova.SL</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                版本 0.1.0
                                <span className="mx-2 text-border">|</span>
                                <span className="font-bold text-destructive">Canary</span>
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Nova.SL 是由 NEXORA Studios 开发的一款现代化 Minecraft 服务器管理启动器。
                        <br />
                        致力于为服务器管理员提供简洁、高效、美观的管理体验。
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                            <GithubIcon className="size-4" />
                            <span className="translate-y-0.5">GitHub</span>
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                            <GlobeIcon className="size-4" />
                            <span className="translate-y-0.5">官方网站</span>
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                            <BookIcon className="size-4" />
                            <span className="translate-y-0.5">文档</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">技术栈</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex justify-between">
                                <span>前端框架</span>
                                <span className="font-mono text-foreground">React + TypeScript</span>
                            </li>
                            <li className="flex justify-between">
                                <span>桌面框架</span>
                                <span className="font-mono text-foreground">Tauri v2</span>
                            </li>
                            <li className="flex justify-between">
                                <span>样式方案</span>
                                <span className="font-mono text-foreground">TailwindCSS</span>
                            </li>
                            <li className="flex justify-between">
                                <span>UI 组件</span>
                                <span className="font-mono text-foreground">shadcn/ui</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">开发团队</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 px-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                    <img src="/nexora-studios-logo.webp" alt="NEXORA Studios Logo" className="size-full" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">NEXORA Studios</p>
                                    <p className="text-xs text-muted-foreground">核心开发团队</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-auto gap-2"
                                    onClick={() => openUrl("https://github.com/NEXORA-Studios")}>
                                    <ExternalLinkIcon className="size-4" />
                                    <span className="translate-y-0.5">GitHub</span>
                                </Button>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                    <img src="/moyuan-cn-avatar.webp" alt="MoYuan-CN Avatar" className="size-full" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">MoYuan-CN</p>
                                    <p className="text-xs text-muted-foreground">核心开发者</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-auto gap-2"
                                    onClick={() => openUrl("https://github.com/MoYuan-CN")}>
                                    <ExternalLinkIcon className="size-4" />
                                    <span className="translate-y-0.5">GitHub</span>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default InfoPage;
