import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
// Layout
import Layout from "@/layout";
// Internal Page
import NotFound from "@/app/_internal/404";
import ServerError from "@/app/_internal/error";
// Server Related
import Dashboard from "@/app/server/page";
import Terminal from "@/app/server/[serverId]/terminal";
import Files from "@/app/server/[serverId]/files";
import InstanceSettings from "@/app/server/[serverId]/settings/page";
import NewServerPage from "@/app/server/new/page";
import CreateServerPage from "@/app/server/new/create/page";
import ImportServerPage from "@/app/server/new/import/page";
import InitServerPage from "@/app/server/new/init/page";
// Download Related
import ModsDownloadPage from "@/app/download/mods/page";
import ModDetailPage from "@/app/download/mods/[projectId]/page";
import PluginsDownloadPage from "@/app/download/plugins/page";
import PluginDetailPage from "@/app/download/plugins/[projectId]/page";
// App (Self) Related
import SettingsPage from "@/app/base/settings/page";
import InfoPage from "@/app/base/info/page";

import "./assets/entry.css";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout />,
        errorElement: <ServerError />,
        children: [
            { index: true, element: <Dashboard /> },
            {
                path: "server/new",
                element: <NewServerPage />,
            },
            {
                path: "server/new/create",
                element: <CreateServerPage />,
            },
            {
                path: "server/new/import",
                element: <ImportServerPage />,
            },
            {
                path: "server/new/init/:serverId",
                element: <InitServerPage />,
            },
            {
                path: "server/instance/:serverId",
                children: [
                    { path: "terminal", element: <Terminal /> },
                    { path: "files", element: <Files /> },
                    { path: "settings", element: <InstanceSettings /> },
                ],
            },
            {
                path: "app",
                children: [
                    { path: "settings", element: <SettingsPage /> },
                    { path: "info", element: <InfoPage /> },
                ],
            },
            {
                path: "download",
                children: [
                    { path: "mods", element: <ModsDownloadPage /> },
                    { path: "mods/:projectId", element: <ModDetailPage /> },
                    { path: "plugins", element: <PluginsDownloadPage /> },
                    { path: "plugins/:projectId", element: <PluginDetailPage /> },
                ],
            },
            // Always last
            { path: "*", element: <NotFound /> },
        ],
    },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
