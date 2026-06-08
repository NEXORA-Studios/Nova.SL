export interface InstanceMetadata {
    id: string;
    name: string;
    version: string;
    loader: string;
}

export interface InstanceConfig {
    instance: InstanceMetadata;
}

export interface ServerProperties {
    port: number;
    online_mode: boolean;
}

export interface ModEntry {
    name: string;
    source: string;
    checksum?: string;
    version?: string;
}

export interface PluginEntry {
    name: string;
    source: string;
    checksum?: string;
    version?: string;
}

export interface McdrPluginEntry {
    name: string;
    source: string;
    checksum?: string;
    version?: string;
}

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

export interface ExtensionsConfig {
    mod: ModEntry[];
    plugin: PluginEntry[];
    mcdr_plugin: McdrPluginEntry[];
}
