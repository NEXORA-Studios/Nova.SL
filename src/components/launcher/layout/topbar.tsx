import React, { useMemo } from "react";
import { useLocation } from "react-router";
import { cn } from "@/utils/utils";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbEntry {
    label: string;
    href?: string;
    /** 不可导航，仅作展示 */
    inert?: boolean;
}

interface BreadcrumbRoute {
    pattern: string;
    label: string;
    parent?: string;
    /** 在此路由与 parent 之间插入一个动态的、不可导航的面包屑项（用于通配符段的可读名称） */
    dynamicSegment?: true;
}

const breadcrumbRoutes: BreadcrumbRoute[] = [
    { pattern: "/", label: "仪表盘" },
    { pattern: "/server/*", label: "服务器" },
    { pattern: "/server/new", parent: "/server/*", label: "新建服务器" },
    { pattern: "/server/new/*", parent: "/server/*", label: "新建服务器" },
    { pattern: "/server/instance/*/terminal", label: "终端", parent: "/server/*", dynamicSegment: true },
    { pattern: "/server/instance/*/files", label: "文件管理", parent: "/server/*", dynamicSegment: true },
    { pattern: "/server/instance/*/settings", label: "设置", parent: "/server/*", dynamicSegment: true },
    { pattern: "/download", label: "资源" },
    { pattern: "/download/mods", label: "模组", parent: "/download" },
    { pattern: "/download/mods/*", label: "详情", parent: "/download/mods", dynamicSegment: true },
    { pattern: "/download/plugins", label: "插件", parent: "/download" },
    { pattern: "/download/mcdr-plugins", label: "MCDR 插件", parent: "/download" },
    { pattern: "/app", label: "应用" },
    { pattern: "/app/settings", label: "设置", parent: "/app" },
    { pattern: "/app/info", label: "关于", parent: "/app" },
];

function matchRoute(pathname: string, pattern: string): boolean {
    const regex = new RegExp(`^${pattern.replace(/\*/g, "[^/]+")}$`);
    return regex.test(pathname);
}

function resolvePathname(pattern: string, pathname: string): string {
    const patternParts = pattern.split("/");
    const pathParts = pathname.split("/");
    return patternParts.map((part, i) => (part === "*" ? pathParts[i] : part)).join("/");
}

function extractWildcardValue(pattern: string, pathname: string): string | undefined {
    const patternParts = pattern.split("/");
    const pathParts = pathname.split("/");
    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i] === "*") return pathParts[i];
    }
    return undefined;
}

function useBreadcrumbs(): BreadcrumbEntry[] {
    const location = useLocation();

    return useMemo(() => {
        const pathname = location.pathname;
        const matched = breadcrumbRoutes.filter((route) => matchRoute(pathname, route.pattern));

        if (matched.length === 0) return [];

        const deepest = matched[matched.length - 1];
        const crumbs: BreadcrumbEntry[] = [];

        const visited = new Set<string>();
        let current: BreadcrumbRoute | undefined = deepest;

        while (current) {
            if (visited.has(current.pattern)) break;
            visited.add(current.pattern);

            // 先插入当前标签
            crumbs.unshift({
                label: current.label,
                href: current.parent ? resolvePathname(current.pattern, pathname) : undefined,
            });

            // 再插入动态段（在当前标签之后，parent 标签之前）
            if (current.dynamicSegment && current.parent) {
                const serverId = extractWildcardValue(current.pattern, pathname);
                if (serverId) {
                    crumbs.unshift({
                        label: serverId,
                        inert: true,
                    });
                }
            }

            if (!current.parent) break;
            current = breadcrumbRoutes.find((r) => r.pattern === current!.parent);
        }

        // 最后一项不设 href（当前页）
        if (crumbs.length > 0) {
            crumbs[crumbs.length - 1].href = undefined;
        }

        return crumbs;
    }, [location.pathname]);
}

interface TopbarProps {
    className?: string;
}

function Topbar({ className }: TopbarProps) {
    const breadcrumbs = useBreadcrumbs();

    return (
        <header
            className={cn(
                "flex h-16 w-full shrink-0 items-center justify-between border-b border-border bg-background px-4",
                className
            )}>
            {breadcrumbs.length > 0 && (
                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.map((crumb, index) => {
                            const isLast = index === breadcrumbs.length - 1;
                            return (
                                <React.Fragment key={index}>
                                    <BreadcrumbItem>
                                        {isLast ? (
                                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                        ) : crumb.inert ? (
                                            <span className="font-normal text-foreground">{crumb.label}</span>
                                        ) : (
                                            <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                    {!isLast && <BreadcrumbSeparator />}
                                </React.Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            )}
        </header>
    );
}

export { Topbar };
