"use client";

import { FileArchive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Version } from "@/models/tauri/modrinth";

interface VersionDetailProps {
    version: Version;
}

export function VersionDetail({ version }: VersionDetailProps) {
    return (
        <div className="border-t px-3 py-3">
            <div className="space-y-3">
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">文件</h4>
                    {version.files.map((file) => (
                        <div
                            key={file.filename}
                            className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                                <FileArchive className="size-4 shrink-0 text-muted-foreground" />
                                <span className="truncate">{file.filename}</span>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                        </div>
                    ))}
                </div>

                {version.dependencies.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground">依赖</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {version.dependencies.map((dep, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                    {dep.dependency_type}: {dep.project_id || dep.version_id || dep.file_name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
