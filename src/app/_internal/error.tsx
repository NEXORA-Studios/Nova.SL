import { Link, useRouteError } from "react-router";
import { AlertTriangleIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "@/components/ui/theme-provider";

function ServerError() {
    const error = useRouteError();

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="flex h-screen w-screen flex-1 flex-col items-center justify-center gap-6 p-8">
                <div className="relative">
                    <span className="text-[8rem] leading-none font-black tracking-tighter text-muted-foreground/20 select-none">
                        500
                    </span>
                    <AlertTriangleIcon className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 text-destructive" />
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">出了点问题</h1>
                    <p className="max-w-sm text-sm text-muted-foreground">服务器遇到了意外错误，请稍后重试。</p>
                    {import.meta.env.DEV && (
                        <pre className="mt-2 max-w-lg overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
                            {error instanceof Error ? error.message : String(error)}
                        </pre>
                    )}
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        <RotateCwIcon className="mr-2 size-4" />
                        重新加载
                    </Button>
                    <Button asChild variant="outline">
                        <Link to="/">返回首页</Link>
                    </Button>
                </div>
            </div>
        </ThemeProvider>
    );
}

export default ServerError;

