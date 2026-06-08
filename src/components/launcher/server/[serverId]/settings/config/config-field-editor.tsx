import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ConfigField, ConfigValue } from "@/models/server-config/types";

interface ConfigFieldEditorProps {
    field: ConfigField;
    value: ConfigValue;
    onChange: (value: ConfigValue) => void;
}

export function ConfigFieldEditor({ field, value, onChange }: ConfigFieldEditorProps) {
    const displayValue = value ?? field.value;

    switch (field.type) {
        case "boolean":
            return (
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <Label>{field.label}</Label>
                        {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                    </div>
                    <Switch checked={Boolean(displayValue)} onCheckedChange={(checked) => onChange(checked)} />
                </div>
            );

        case "number":
            return (
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <Label>{field.label}</Label>
                        {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                    </div>
                    <Input
                        type="number"
                        value={Number(displayValue)}
                        onChange={(e) => onChange(Number(e.target.value))}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        placeholder={field.placeholder}
                        className="h-10 w-48"
                    />
                </div>
            );

        case "select":
            return (
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <Label>{field.label}</Label>
                        {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                    </div>
                    <Select value={String(displayValue)} onValueChange={(v) => onChange(v)}>
                        <SelectTrigger className="h-10! w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                            {field.options?.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );

        case "textarea":
            return (
                <div className="space-y-2">
                    <Label>{field.label}</Label>
                    <Textarea
                        value={String(displayValue)}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder}
                        rows={4}
                    />
                    {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                </div>
            );

        case "string":
        default:
            return (
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <Label>{field.label}</Label>
                        {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                    </div>
                    <Input
                        value={String(displayValue)}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder}
                        className="h-10 w-48"
                    />
                </div>
            );
    }
}
