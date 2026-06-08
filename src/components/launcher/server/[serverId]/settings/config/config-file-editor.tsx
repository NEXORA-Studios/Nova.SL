import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigFieldEditor } from "./config-field-editor";
import type { ConfigFileDefinition, ConfigFileContent } from "@/models/server-config/types";

interface ConfigFileEditorProps {
    definition: ConfigFileDefinition;
    content: ConfigFileContent;
    onChange: (content: ConfigFileContent) => void;
}

export function ConfigFileEditor({ definition, content, onChange }: ConfigFileEditorProps) {
    const [activeTab, setActiveTab] = useState(definition.categories[0]?.id ?? "");

    const handleFieldChange = useCallback(
        (key: string, value: string | number | boolean) => {
            onChange({ ...content, [key]: value });
        },
        [content, onChange]
    );

    return (
        <div className="space-y-4">
            <CardHeader className="px-0 pt-0">
                <CardTitle>{definition.title}</CardTitle>
                <CardDescription>{definition.description}</CardDescription>
            </CardHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="flex h-auto flex-wrap justify-start gap-1">
                    {definition.categories.map((category) => (
                        <TabsTrigger key={category.id} value={category.id} className="text-xs" title={category.description}>
                            {category.title}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {definition.categories.map((category) => (
                    <TabsContent key={category.id} value={category.id} className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{category.title}</CardTitle>
                                {category.description && <CardDescription>{category.description}</CardDescription>}
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6">
                                    {category.fields.map((field) => (
                                        <ConfigFieldEditor
                                            key={field.key}
                                            field={field}
                                            value={content[field.key] ?? field.value}
                                            onChange={(value) => handleFieldChange(field.key, value)}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
