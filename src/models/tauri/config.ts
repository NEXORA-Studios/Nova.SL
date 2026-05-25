export type ThemeMode = "light" | "dark" | "system";
export type DefaultEditor = "internal" | "custom";

export interface TerminalConfig {
    ctrl_enter_to_send: boolean;
}

export interface EditorConfig {
    default_editor: DefaultEditor;
    custom_start_command: string;
}

export interface UiConfig {
    theme: ThemeMode;
    terminal: TerminalConfig;
    editor: EditorConfig;
}

export interface ServerInstanceConfig {
    id: string;
    name: string;
    path: string;
    loader?: string;
    version?: string;
}

export interface ServerConfig {
    instances: ServerInstanceConfig[];
}

export interface AppConfig {
    ui: UiConfig;
    server: ServerConfig;
}
