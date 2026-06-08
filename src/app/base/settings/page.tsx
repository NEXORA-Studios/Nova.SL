import { GeneralSettings } from "@/components/launcher/app/settings/general-settings";
import { ServerInstanceSettings } from "@/components/launcher/app/settings/server-instance-settings";
import { JavaSettings } from "@/components/launcher/app/settings/java-settings";

function SettingsPage() {
    return (
        <div className="mx-auto flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold">应用程序设置</h1>
                <p className="mt-1 text-sm text-muted-foreground">管理 Nova.SL 的外观、启动项以及全局服务器实例</p>
            </div>
            <GeneralSettings />
            <JavaSettings />
            <ServerInstanceSettings />
        </div>
    );
}

export default SettingsPage;
