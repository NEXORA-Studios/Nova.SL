export type NbtNodeType =
    | "end"
    | "byte"
    | "short"
    | "int"
    | "long"
    | "float"
    | "double"
    | "bytearray"
    | "string"
    | "list"
    | "compound"
    | "intarray"
    | "longarray";

export interface NbtNode {
    name: string;
    node_type: NbtNodeType;
    value: string | null;
    children: NbtNode[];
}

export interface NbtTree {
    file_path: string;
    root: NbtNode;
    compression: string;
}
