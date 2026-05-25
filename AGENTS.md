# Nova.SL - Agent Guidelines

## Project Overview

Nova.SL is a Minecraft server launcher built with Tauri (Rust) + React + TypeScript. It provides a modern desktop application for managing Minecraft server instances, including server creation, importing, file management, terminal access, and process control.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Rust + Tauri v2
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **State Management**: Zustand
- **Routing**: React Router v7
- **Package Manager**: pnpm (frontend), Cargo (Rust)

## Code Style

### TypeScript / React

- **Indentation**: 4 spaces
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Line endings**: CRLF
- **Print width**: 128 characters
- **Trailing commas**: ES5 compatible
- **Bracket same line**: true

```typescript
// Example component structure
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
    serverId: string;
    onUpdate?: () => void;
}

export function ServerCard({ serverId, onUpdate }: Props) {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        setIsLoading(true);
        // ...
        setIsLoading(false);
    };

    return (
        <div className="flex items-center gap-4 rounded-lg border p-4">
            <Button onClick={handleClick} disabled={isLoading}>
                Action
            </Button>
        </div>
    );
}
```

### Rust

- Follow standard Rust formatting (`cargo fmt`)
- Use `snake_case` for functions and variables
- Use `PascalCase` for types and traits
- Use `SCREAMING_SNAKE_CASE` for constants
- Organize imports: std -> external crates -> internal modules
- Add logging for command entry points

```rust
use std::path::PathBuf;
use tauri::State;

use crate::core::instance::config::InstanceConfig;

#[tauri::command]
pub fn get_instance_config(instance_dir: String) -> Result<InstanceConfig, String> {
    log::info!("[command] get_instance_config: dir={}", instance_dir);
    let path = PathBuf::from(instance_dir);
    // ...
}
```

## Project Structure

```
Nova.SL/
├── src/                          # Frontend source
│   ├── app/                      # Route pages
│   │   ├── server/               # Server-related pages
│   │   └── base/                 # App-level pages (settings, info)
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   └── launcher/             # App-specific components
│   ├── lib/                      # Utility libraries
│   │   └── tauri/                # Tauri command wrappers
│   ├── models/                   # TypeScript type definitions
│   │   └── tauri/                # Tauri-related types
│   ├── stores/                   # Zustand stores
│   ├── hooks/                    # Custom React hooks
│   └── assets/                   # Static assets
├── src-tauri/                    # Rust backend
│   └── src/
│       ├── command/              # Tauri command handlers
│       ├── core/                 # Core business logic
│       │   ├── app/              # App configuration
│       │   ├── file/             # File operations
│       │   ├── instance/         # Server instance management
│       │   │   ├── download/     # Plugin downloaders
│       │   │   ├── process/      # Process management
│       │   │   └── config.rs     # Instance configuration
│       │   ├── java/             # Java installation scanning
│       │   └── system/           # System information
│       └── utils/                # Utility functions
└── docs/                         # Documentation
```

## Naming Conventions

- **Components**: PascalCase (e.g., `ServerCard`, `TerminalOutput`)
- **Hooks**: camelCase with `use` prefix (e.g., `useServerStore`, `useIsCurrentPath`)
- **Stores**: camelCase with `use` prefix (e.g., `useServerStore`)
- **Utility functions**: camelCase (e.g., `cn`, `formatBytes`)
- **Tauri commands**: snake_case (e.g., `get_instance_config`, `start_instance`)
- **Files**: kebab-case for components (e.g., `server-card.tsx`, `terminal-output.tsx`)
- **Rust modules**: snake_case (e.g., `instance.rs`, `process_manager.rs`)

## Key Patterns

### Frontend State Management (Zustand)

```typescript
import { create } from "zustand";

interface ServerState {
    instances: ServerInstance[];
    selectedId: string | null;
    // Actions
    setInstances: (instances: ServerInstance[]) => void;
    updateInstance: (id: string, patch: Partial<ServerInstance>) => void;
    // Computed
    runningCount: () => number;
}

export const useServerStore = create<ServerState>((set, get) => ({
    instances: [],
    selectedId: null,
    setInstances(instances) {
        set({ instances });
    },
    updateInstance(id, patch) {
        set((state) => ({
            instances: state.instances.map((inst) =>
                inst.id === id ? { ...inst, ...patch } : inst
            ),
        }));
    },
    runningCount() {
        return get().instances.filter((s) => s.status === "running").length;
    },
}));
```

### Tauri Command Wrapper

```typescript
// src/lib/tauri/instance.ts
import { invoke } from "@tauri-apps/api/core";
import type { InstanceConfig } from "@/models/tauri/instance";

export async function getInstanceConfig(instanceDir: string): Promise<InstanceConfig> {
    return invoke("get_instance_config", { instanceDir });
}
```

### Rust Command Handler

```rust
#[tauri::command]
pub fn get_instance_config(instance_dir: String) -> Result<InstanceConfig, String> {
    log::info!("[command] get_instance_config: dir={}", instance_dir);
    let path = PathBuf::from(instance_dir);
    instance_config::load_instance_config(&path).map_err(|e| {
        log::error!("[command] get_instance_config failed: {:?}", e);
        format!("{:?}", e)
    })
}
```

## Commands

```bash
# Development
pnpm dev              # Start Vite dev server
pnpm tauri dev        # Start Tauri dev mode

# Building
pnpm build            # Build frontend
pnpm tauri build      # Build Tauri app

# Formatting
pnpm format           # Run Prettier on all files
cargo fmt             # Format Rust code
```

## Important Notes

1. **Tauri v2**: This project uses Tauri v2 with the new plugin system
2. **Tailwind v4**: Uses the new `@tailwindcss/vite` plugin
3. **React 19**: Uses the latest React version with new features
4. **shadcn/ui**: Components are in `src/components/ui/`
5. **Process Management**: Server processes are managed via Rust with async Tokio runtime
6. **File Operations**: All file operations go through Tauri commands for security
7. **Never Start Dev Servers**: Do NOT run `pnpm tauri dev`, `pnpm dev`, or any long-running development server.
8. **No Process Killing or System Cleanup**: Do NOT kill any processes or clean up any system files.
9. **No Environment Manipulation**: Do NOT modify any environment variables or system settings.

## Common Tasks

### Adding a new Tauri command

1. Add command handler in `src-tauri/src/command/{module}.rs`
2. Register in `src-tauri/src/lib.rs` invoke handler
3. Create TypeScript wrapper in `src/lib/tauri/{module}.ts`
4. Add types in `src/models/tauri/{module}.ts`

### Adding a new route

1. Create page component in `src/app/{path}/page.tsx`
2. Add route in `src/entrypoint.tsx`
3. Update sidebar/navigation if needed

### Adding a new UI component

1. Use shadcn/ui CLI or manually create in `src/components/ui/`
2. Follow existing component patterns
3. Export from `src/components/ui/index.ts` if applicable
