import LoaderData from "@/assets/loader.json";
import { CircleQuestionMarkIcon } from "lucide-react";

interface LoaderDataItem {
    icon: string;
    name: string;
    supported_project_types: string[];
}

export function LoaderIcon({ name, className }: { name: string; className?: string }) {
    const loaderItem = (LoaderData as LoaderDataItem[]).find((item) => item.name === name);

    if (!loaderItem) {
        return <CircleQuestionMarkIcon className={className} />;
    }

    return <i dangerouslySetInnerHTML={{ __html: loaderItem.icon }} className={className}></i>;
}
