"use client";

import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getModrinthProject, getModrinthVersions } from "@/lib/tauri/modrinth";
import { ProjectHeader } from "@/components/launcher/download/mods/project-header";
import { VersionList } from "@/components/launcher/download/mods/version-list";
import type { Project, Version } from "@/models/tauri/modrinth";

interface ModrinthProjectDetailPageProps {
    itemLabel: string;
}

export function ModrinthProjectDetailPage({ itemLabel }: ModrinthProjectDetailPageProps) {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [versions, setVersions] = useState<Version[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isVersionsLoading, setIsVersionsLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;

        async function loadProject() {
            setIsLoading(true);
            try {
                const proj = await getModrinthProject(projectId!);
                console.debug(proj);
                setProject(proj);
            } catch (error) {
                console.error("Failed to load project:", error);
                toast.error(`加载${itemLabel}详情失败`);
            } finally {
                setIsLoading(false);
            }
        }

        async function loadVersions() {
            setIsVersionsLoading(true);
            try {
                const vers = await getModrinthVersions(projectId!);
                setVersions(vers);
            } catch (error) {
                console.error("Failed to load versions:", error);
                toast.error("加载版本列表失败");
            } finally {
                setIsVersionsLoading(false);
            }
        }

        loadProject();
        loadVersions();
    }, [itemLabel, projectId]);

    if (isLoading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="size-8 animate-spin" />
                <p className="text-sm">加载中...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <p>未找到该{itemLabel}</p>
                <Button variant="outline" onClick={() => navigate(-1)}>
                    返回
                </Button>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate(-1)}>
                    <ArrowLeft className="size-4" />
                    返回
                </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-6 pr-4">
                <ProjectHeader project={project} />

                <Separator />

                <div className="flex min-h-0 flex-1 flex-col space-y-3">
                    <h2 className="text-lg font-semibold">版本列表</h2>
                    <div className="min-h-0 flex-1">
                        <VersionList versions={versions} isLoading={isVersionsLoading} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ModDetailPage() {
    return <ModrinthProjectDetailPage itemLabel="模组" />;
}
