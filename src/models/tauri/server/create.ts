/** Internal Type, Do Not Use Directly */
interface __InfoBase {
    id: string;
    display_name?: string;
}

export interface VersionInfo extends __InfoBase {
    supported: boolean;
}

export interface VersionGroup extends __InfoBase {
    versions: VersionInfo[];
}

export interface BuildInfo extends __InfoBase {
    channel: "STABLE" | "BETA" | "ALPHA";
}
