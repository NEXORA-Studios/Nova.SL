export interface LaunchScript {
    path: string;
    script_type: string;
    java_path?: string;
    java_args: string[];
    server_jar?: string;
}

export type ServerLoader =
    | "vanilla"
    | "forge"
    | "fabric"
    | "quilt"
    | "neoforge"
    | "paper"
    | "spigot"
    | "bukkit"
    | "purpur"
    | "folia"
    | "bungee_cord"
    | "waterfall"
    | "velocity"
    | "custom";

export type ModType = "none" | "forge" | "fabric" | "quilt" | "neoforge" | "mixed";

export interface ImportAnalysis {
    instance_path: string;
    server_name: string;
    launch_script?: LaunchScript;
    loader: ServerLoader;
    mod_type: ModType;
    version?: string;
    detected_java?: string;
    suggested_java: boolean;
}
