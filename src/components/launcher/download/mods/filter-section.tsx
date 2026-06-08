"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FilterSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-foreground/80">
                {title}
                {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent>{children}</CollapsibleContent>
        </Collapsible>
    );
}
