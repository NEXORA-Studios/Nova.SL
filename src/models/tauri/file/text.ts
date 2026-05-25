export type TextFileFormat = "json" | "toml" | "yaml" | "properties" | "plain";

export interface TextContent {
    Json?: unknown;
    Toml?: unknown;
    Yaml?: unknown;
    Properties?: Record<string, string>;
    Plain?: string;
}
