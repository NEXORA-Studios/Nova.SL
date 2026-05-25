import { HeartIcon } from "lucide-react";

function Footer() {
    return (
        <footer className="flex h-8 shrink-0 items-center justify-center gap-1 border-t border-border bg-card text-xs text-muted-foreground select-none">
            <span className="-ml-8">© 2026 NEOXRA Studios. All rights reserved.</span>
            <span className="mx-0.5">·</span>
            <span className="inline-flex items-center gap-0.5">
                Made with
                <HeartIcon className="size-3 mx-px text-destructive fill-destructive" />
                by NEOXRA Studios
            </span>
        </footer>
    );
}

export { Footer };
