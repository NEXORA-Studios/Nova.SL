import { useLocation } from "react-router";

export interface IsCurrentPathOptions {
    path: string;
    mode?: "exact" | "prefix" | "wildcard";
}

export function useIsCurrentPath() {
    const location = useLocation();

    return ({ path, mode = "exact" }: IsCurrentPathOptions) => {
        const current = location.pathname;

        if (mode === "exact") {
            return current === path;
        }

        if (mode === "prefix") {
            return current.startsWith(path);
        }

        if (mode === "wildcard") {
            // 支持 /users/* 这种
            const pattern = path.replace(/\*/g, ".*");
            const regex = new RegExp(`^${pattern}$`);
            return regex.test(current);
        }

        return false;
    };
}
