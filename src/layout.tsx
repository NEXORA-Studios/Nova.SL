import { Outlet } from "react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/launcher/layout/sidebar";
import { Topbar } from "@/components/launcher/layout/topbar";
import { Footer } from "@/components/launcher/layout/footer";

function Layout() {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TooltipProvider>
                <div className="flex h-screen w-full overflow-hidden">
                    <Sidebar />
                    <main className="flex flex-1 flex-col overflow-hidden">
                        <Topbar />
                        <div className="flex-1 overflow-auto bg-background p-8">
                            <Outlet />
                        </div>
                        <Footer />
                    </main>
                </div>
                <Toaster />
            </TooltipProvider>
        </ThemeProvider>
    );
}

export default Layout;
