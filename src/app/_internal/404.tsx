import { Link } from "react-router";
import { ConstructionIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

function NotFound() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 w-full h-full">
            <div className="relative">
                <span className="text-[8rem] leading-none font-black tracking-tighter text-muted-foreground/20 select-none">
                    404
                </span>
                <ConstructionIcon className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">页面施工中</h1>
                <p className="max-w-sm text-sm text-muted-foreground">这个页面还在建设中，请稍后再来看看。</p>
            </div>
            <Button asChild variant="outline">
                <Link to="/">返回首页</Link>
            </Button>
        </div>
    );
}

export default NotFound;
