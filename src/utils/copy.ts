import { toast } from "sonner";

export async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        // 使用旧方法复制到剪贴板
        try {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
        } catch {
            toast.error("复制失败");
            return;
        }
    }
    toast.success("复制成功");
}
