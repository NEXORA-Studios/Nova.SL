import { Link, useRouteError } from "react-router";
import { AlertTriangleIcon, ClipboardIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { copyText } from "@/utils/copy";

function ServerError() {
    const error = useRouteError();
    const _err = error instanceof Error ? error.message : String(error);

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
                    <p className="max-w-sm text-sm text-muted-foreground">Nova.SL 遇到了意外错误，请稍后重试。</p>
                    {import.meta.env.DEV && (
                        <pre className="mt-2 max-w-lg overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
                            {_err}
                        </pre>
                    )}
                </div>
                <div className="flex gap-3">
                    {import.meta.env.DEV && (
                        <Button variant="outline" onClick={() => copyText(_err)}>
                            <ClipboardIcon className="mr-2 size-4" />
                            复制错误信息
                        </Button>
                    )}
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
