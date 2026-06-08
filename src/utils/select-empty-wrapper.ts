const EMPTY_VALUE = "__none__";

export function wrapEmptySelectOptionValue(value: any) {
    return value === EMPTY_VALUE ? "" : value;
}
export function getEmptySelectOptionValue() {
    return EMPTY_VALUE;
}
