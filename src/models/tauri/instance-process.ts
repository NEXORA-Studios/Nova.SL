export interface BasicConfig {
    launch_method: string;
    server_jar: string;
    java_target: string;
    script_path?: string;
}

export interface JvmArgs {
    min_memory: string;
    max_memory: string;
    gc?: string;
    extra_args: string[];
}

export interface GameProps {
    nogui: boolean;
}

export interface LaunchConfig {
    basic: BasicConfig;
    jvm_args: JvmArgs;
    game_props: GameProps;
}

export interface LogEntry {
    stream: "stdin" | "stdout" | "stderr";
    line: string;
    timestamp: string;
}
