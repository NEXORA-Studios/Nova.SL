import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * 格式化数字，添加千分位分隔符
 */
export function formatNumber(num: number): string {
    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(1) + "B";
    }
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1) + "M";
    }
    if (num >= 1_000) {
        return (num / 1_000).toFixed(1) + "K";
    }
    return num.toString();
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffYear > 0) return `${diffYear} 年前`;
    if (diffMonth > 0) return `${diffMonth} 个月前`;
    if (diffDay > 0) return `${diffDay} 天前`;
    if (diffHour > 0) return `${diffHour} 小时前`;
    if (diffMin > 0) return `${diffMin} 分钟前`;
    return "刚刚";
}
