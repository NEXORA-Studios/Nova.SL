"use client";

import { ModrinthDownloadPage } from "@/app/download/mods/page";

export default function PluginsDownloadPage() {
    return (
        <ModrinthDownloadPage
            projectType="plugin"
            searchPlaceholder="搜索插件..."
            emptyText="未找到匹配的插件"
            detailPathBase="/download/plugins"
        />
    );
}
