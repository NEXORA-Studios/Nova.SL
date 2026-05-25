import { GeneralSettings } from "@/components/launcher/app/settings/general-settings";
import { ServerInstanceSettings } from "@/components/launcher/app/settings/server-instance-settings";
import { JavaSettings } from "@/components/launcher/app/settings/java-settings";

function SettingsPage() {
    return (
        <div className="flex flex-col gap-6 mx-auto">
            <div>
                <h1 className="text-2xl font-bold">应用程序设置</h1>
                <p className="text-sm text-muted-foreground mt-1">管理 Nova.SL 的外观、启动项以及全局服务器实例</p>
            </div>
            <GeneralSettings />
            <JavaSettings />
            <ServerInstanceSettings />
        </div>
    );
}

export default SettingsPage;
