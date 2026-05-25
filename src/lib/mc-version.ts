export type VersionSuffixKind = "release" | "rc" | "pre" | "snapshot";

export interface ParsedMcVersion {
    major: number;
    minor: number;
    patch: number;
    suffixKind: VersionSuffixKind;
    suffixNumber: number;
    snapshotYear?: number;
    snapshotWeek?: number;
}

export function parseMcVersion(input: string): ParsedMcVersion {
    const trimmed = input.trim();

    if (/^\d{2}w\d{2}[a-z]$/i.test(trimmed)) {
        const yearMatch = trimmed.match(/^(\d{2})w/);
        const weekMatch = trimmed.match(/w(\d{2})/);
        return {
            major: 0,
            minor: 0,
            patch: 0,
            suffixKind: "snapshot",
            suffixNumber: 0,
            snapshotYear: yearMatch ? parseInt(yearMatch[1], 10) : 0,
            snapshotWeek: weekMatch ? parseInt(weekMatch[1], 10) : 0,
        };
    }

    const [base, suffix] = trimmed.split("-") as [string, string | undefined];

    const parts = base.split(".");
    const major = parseInt(parts[0] || "0", 10);
    const minor = parseInt(parts[1] || "0", 10);
    const patch = parseInt(parts[2] || "0", 10);

    let suffixKind: VersionSuffixKind = "release";
    let suffixNumber = 0;

    if (suffix) {
        if (suffix.startsWith("rc")) {
            suffixKind = "rc";
            const numMatch = suffix.match(/^rc(\d+)$/i);
            suffixNumber = numMatch ? parseInt(numMatch[1], 10) : 0;
        } else if (suffix.startsWith("pre")) {
            suffixKind = "pre";
            const numMatch = suffix.match(/^pre(\d+)$/i);
            suffixNumber = numMatch ? parseInt(numMatch[1], 10) : 0;
        }
    }

    return {
        major,
        minor,
        patch,
        suffixKind,
        suffixNumber,
        snapshotYear: undefined,
        snapshotWeek: undefined,
    };
}

const SUFFIX_ORDER: Record<VersionSuffixKind, number> = {
    release: 2,
    rc: 1,
    pre: 0,
    snapshot: 3,
};

export function compareMcVersions(a: string, b: string): number {
    const parsedA = parseMcVersion(a);
    const parsedB = parseMcVersion(b);

    if (parsedA.suffixKind === "snapshot" && parsedB.suffixKind === "snapshot") {
        if (parsedA.snapshotYear !== parsedB.snapshotYear) {
            return parsedA.snapshotYear! - parsedB.snapshotYear!;
        }
        return parsedA.snapshotWeek! - parsedB.snapshotWeek!;
    }

    if (parsedA.suffixKind === "snapshot") return -1;
    if (parsedB.suffixKind === "snapshot") return 1;

    if (parsedA.major !== parsedB.major) {
        return parsedA.major - parsedB.major;
    }

    if (parsedA.minor !== parsedB.minor) {
        return parsedA.minor - parsedB.minor;
    }

    if (parsedA.patch !== parsedB.patch) {
        return parsedA.patch - parsedB.patch;
    }

    const kindDiff = SUFFIX_ORDER[parsedA.suffixKind] - SUFFIX_ORDER[parsedB.suffixKind];
    if (kindDiff !== 0) {
        return kindDiff;
    }

    return parsedA.suffixNumber - parsedB.suffixNumber;
}

export function sortMcVersions(versions: string[], order: "desc" | "asc" = "desc"): string[] {
    const sorted = [...versions].sort(compareMcVersions);
    return order === "desc" ? sorted.reverse() : sorted;
}

export function sortVersionInfos<T extends { id: string }>(
    versions: T[],
    order: "desc" | "asc" = "desc"
): T[] {
    const sorted = [...versions].sort((a, b) => compareMcVersions(a.id, b.id));
    return order === "desc" ? sorted.reverse() : sorted;
}

export interface ComboboxVersionGroup<T extends { id: string }> {
    value: string;
    display_name?: string;
    items: T[];
}

function isOtherGroup(id: string): boolean {
    const lowerId = id.toLowerCase();
    return lowerId === "other" || lowerId === "其他" || lowerId.includes("other") || lowerId.includes("其他");
}

export function sortVersionGroupsForCombobox<T extends { id: string; display_name?: string; versions: Array<{ id: string }> }>(
    groups: T[],
    order: "desc" | "asc" = "desc"
): ComboboxVersionGroup<T["versions"][number]>[] {
    const otherGroups = groups.filter((g) => isOtherGroup(g.id));
    const normalGroups = groups.filter((g) => !isOtherGroup(g.id));

    const sortedNormalGroups = [...normalGroups].sort((a, b) => compareMcVersions(a.id, b.id));
    const reversedNormalGroups = order === "desc" ? sortedNormalGroups.reverse() : sortedNormalGroups;

    const sortedOtherGroups = otherGroups.map((group) => ({
        value: group.id,
        display_name: group.display_name,
        items: sortVersionInfos(group.versions, order),
    }));

    return [
        ...reversedNormalGroups.map((group) => ({
            value: group.id,
            display_name: group.display_name,
            items: sortVersionInfos(group.versions, order),
        })),
        ...sortedOtherGroups,
    ];
}