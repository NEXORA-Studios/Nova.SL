export interface JavaInstallation {
    path: string;
    version: string;
    major_version: number;
    vendor?: string;
    /** true = 手动添加，false = 自动扫描 */
    manual?: boolean;
    /** true = 参与服务器自动选择 */
    enabled?: boolean;
}

export interface JavaConfig {
    instances: JavaInstallation[];
    last_scan?: string;
}

export type ScanEvent =
    | { type: "started"; total_paths: number }
    | { type: "scanning_path"; path: string; current: number; total: number }
    | { type: "found"; java: JavaInstallation }
    | { type: "completed"; found: number }
    | { type: "error"; message: string };
