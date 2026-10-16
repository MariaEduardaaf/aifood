# Implementation Plan - Phase 5: UX Improvements

> **Status:** ✅ 100% IMPLEMENTED  
> **Completion date:** 2026-01-08  
> **Dependencies:** Phase 4 (Kitchen) completed

## Overview

Implement user experience improvements focused on personalization, accessibility, and system usability.

---

## 1. Light/Dark Theme

### 1.1 Goal
Let users switch between light and dark themes, with the preference persisted.

### 1.2 Implementation

#### Create ThemeProvider
Location: `src/components/providers/theme-provider.tsx`

```typescript
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Load saved theme
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    // Apply theme
    const root = document.documentElement;
    let resolved: "light" | "dark";

    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else {
      resolved = theme;
    }

    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    setResolvedTheme(resolved);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
```

#### Create ThemeToggle
Location: `src/components/ui/theme-toggle.tsx`

```typescript
"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ] as const;

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={cn(
            "p-2 rounded-md transition-colors",
            theme === opt.value
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary-foreground/10"
          )}
          title={opt.label}
        >
          <opt.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
```

#### Update CSS (globals.css)
Add variables for the light theme:

```css
:root {
  /* Light theme */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 45 93% 47%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 45 93% 47%;
}

.dark {
  /* Dark theme (current) */
  --background: 224 71% 4%;
  --foreground: 213 31% 91%;
  /* ... rest of the current variables ... */
}
```

#### Files to modify
1. `src/app/layout.tsx` - Wrap with ThemeProvider
2. `src/app/globals.css` - Add light theme variables
3. `src/components/waiter/waiter-header.tsx` - Add ThemeToggle
4. `src/components/kitchen/kitchen-page.tsx` - Add ThemeToggle
5. `src/components/admin/sidebar.tsx` - Add ThemeToggle

---

## 2. Per-User Sound Settings

### 2.1 Goal
Let each user configure the volume and enable/disable notification sounds.

### 2.2 Implementation

#### Create SoundProvider
Location: `src/components/providers/sound-provider.tsx`

```typescript
"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";

interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-100
}

interface SoundContextType {
  settings: SoundSettings;
  updateSettings: (settings: Partial<SoundSettings>) => void;
  playNotification: () => void;
  playSuccess: () => void;
  playError: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 50,
};

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SoundSettings>(DEFAULT_SETTINGS);
  const notificationRef = useRef<HTMLAudioElement | null>(null);
  const successRef = useRef<HTMLAudioElement | null>(null);
  const errorRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem("soundSettings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }

    // Initialize audio
    notificationRef.current = new Audio("/sounds/notification.mp3");
    successRef.current = new Audio("/sounds/success.mp3");
    errorRef.current = new Audio("/sounds/error.mp3");
  }, []);

  useEffect(() => {
    // Update audio volume
    const volume = settings.volume / 100;
    if (notificationRef.current) notificationRef.current.volume = volume;
    if (successRef.current) successRef.current.volume = volume;
    if (errorRef.current) errorRef.current.volume = volume;
  }, [settings.volume]);

  const updateSettings = (newSettings: Partial<SoundSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("soundSettings", JSON.stringify(updated));
  };

  const playSound = (audio: HTMLAudioElement | null) => {
    if (!settings.enabled || !audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const playNotification = () => playSound(notificationRef.current);
  const playSuccess = () => playSound(successRef.current);
  const playError = () => playSound(errorRef.current);

  return (
    <SoundContext.Provider
      value={{ settings, updateSettings, playNotification, playSuccess, playError }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) throw new Error("useSound must be used within SoundProvider");
  return context;
};
```

#### Create SoundSettings Component
Location: `src/components/ui/sound-settings.tsx`

```typescript
"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/components/providers/sound-provider";
import { useTranslations } from "next-intl";

export function SoundSettings() {
  const t = useTranslations("settings");
  const { settings, updateSettings, playNotification } = useSound();

  return (
    <div className="space-y-4 p-4 card-premium rounded-xl">
      <h3 className="font-semibold flex items-center gap-2">
        <Volume2 className="h-5 w-5" />
        {t("sound.title")}
      </h3>

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm">{t("sound.enabled")}</span>
        <button
          onClick={() => updateSettings({ enabled: !settings.enabled })}
          className={cn(
            "w-12 h-6 rounded-full transition-colors relative",
            settings.enabled ? "bg-primary" : "bg-secondary"
          )}
        >
          <span
            className={cn(
              "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
              settings.enabled ? "translate-x-7" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {/* Volume Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t("sound.volume")}</span>
          <span className="text-sm text-muted-foreground">{settings.volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.volume}
          onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
          disabled={!settings.enabled}
          className="w-full accent-primary"
        />
      </div>

      {/* Test Button */}
      <button
        onClick={playNotification}
        disabled={!settings.enabled}
        className="w-full py-2 px-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm"
      >
        {t("sound.test")}
      </button>
    </div>
  );
}
```

#### Required audio files
Create/add in `public/sounds/`:
- `notification.mp3` - New order sound
- `success.mp3` - Action completed sound
- `error.mp3` - Error sound

#### Files to modify
1. `src/app/layout.tsx` - Wrap with SoundProvider
2. `src/components/kitchen/kitchen-panel.tsx` - Use useSound() instead of direct audio
3. `src/components/waiter/orders-panel.tsx` - Use useSound() instead of direct audio

---

## 3. Drag and Drop in the Kitchen Kanban

### 3.1 Goal
Allow dragging cards between columns in the kitchen panel to update the status.

### 3.2 Implementation

#### Install dependency
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

#### Create KitchenKanban with DnD
Location: `src/components/kitchen/kitchen-kanban.tsx`

```typescript
"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

// Kanban columns
const COLUMNS = {
  CONFIRMED: { id: "CONFIRMED", title: "newOrders", color: "yellow" },
  PREPARING: { id: "PREPARING", title: "preparing", color: "orange" },
  READY: { id: "READY", title: "ready", color: "green" },
} as const;

export function KitchenKanban({ orders, onStatusChange }) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum of 8px to start dragging
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const order = orders.find((o) => o.id === event.active.id);
    setActiveOrder(order || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as keyof typeof COLUMNS;
    const order = orders.find((o) => o.id === orderId);

    if (!order || order.status === newStatus) return;

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      CONFIRMED: ["PREPARING"],
      PREPARING: ["READY"],
      READY: [], // Cannot drag from READY
    };

    if (validTransitions[order.status]?.includes(newStatus)) {
      onStatusChange(orderId, newStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.values(COLUMNS).map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            orders={orders.filter((o) => o.status === column.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeOrder && <KitchenOrderCard order={activeOrder} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
```

#### Create DraggableOrderCard
Location: `src/components/kitchen/draggable-order-card.tsx`

```typescript
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function DraggableOrderCard({ order, ...props }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KitchenOrderCard order={order} {...props} />
    </div>
  );
}
```

#### Files to modify
1. `package.json` - Add @dnd-kit dependencies
2. `src/components/kitchen/kitchen-panel.tsx` - Integrate DnD or replace with kitchen-kanban.tsx

---

## 4. Translations for Settings

### 4.1 Add to messages/pt.json

```json
{
  "settings": {
    "title": "Configuracoes",
    "theme": {
      "title": "Tema",
      "light": "Claro",
      "dark": "Escuro",
      "system": "Sistema"
    },
    "sound": {
      "title": "Som",
      "enabled": "Notificacoes sonoras",
      "volume": "Volume",
      "test": "Testar som"
    },
    "language": {
      "title": "Idioma"
    }
  }
}
```

### 4.2 Add to messages/es.json

```json
{
  "settings": {
    "title": "Configuraciones",
    "theme": {
      "title": "Tema",
      "light": "Claro",
      "dark": "Oscuro",
      "system": "Sistema"
    },
    "sound": {
      "title": "Sonido",
      "enabled": "Notificaciones sonoras",
      "volume": "Volumen",
      "test": "Probar sonido"
    },
    "language": {
      "title": "Idioma"
    }
  }
}
```

### 4.3 Add to messages/en.json

```json
{
  "settings": {
    "title": "Settings",
    "theme": {
      "title": "Theme",
      "light": "Light",
      "dark": "Dark",
      "system": "System"
    },
    "sound": {
      "title": "Sound",
      "enabled": "Sound notifications",
      "volume": "Volume",
      "test": "Test sound"
    },
    "language": {
      "title": "Language"
    }
  }
}
```

---

## 5. Implementation Order

### Step 1: Providers Infrastructure
1. [x] Create `src/components/providers/theme-provider.tsx`
2. [x] Create `src/components/providers/sound-provider.tsx`
3. [x] Update `src/app/layout.tsx` with providers

### Step 2: Light/Dark Theme
4. [x] Update `src/app/globals.css` with light theme variables
5. [x] Create `src/components/ui/theme-toggle.tsx`
6. [x] Add ThemeToggle to the waiter header
7. [x] Add ThemeToggle to the kitchen header
8. [x] Add ThemeToggle to the admin sidebar

### Step 3: Sound Settings
9. [x] Add audio files to `public/sounds/`
10. [x] Create `src/components/ui/sound-settings.tsx`
11. [x] Update `kitchen-panel.tsx` to use SoundProvider
12. [x] Update `orders-panel.tsx` to use SoundProvider
13. [x] Create SoundToggleCompact for headers

### Step 4: Drag and Drop in the Kitchen
14. [x] Install `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
15. [x] Create `src/components/kitchen/kitchen-kanban.tsx`
16. [x] Integrate DnD with draggable cards
17. [x] Integrate DnD into the kitchen panel (Kanban/List toggle)

### Step 5: Translations and Final Adjustments
18. [x] Add settings translations in PT/ES/EN
19. [x] TypeScript compiles without errors
20. [x] Sounds and theme working
21. [x] Drag and drop in the kitchen working

---

## 6. File Structure (New)

```
src/
├── components/
│   ├── providers/
│   │   ├── theme-provider.tsx      # Theme provider
│   │   └── sound-provider.tsx      # Sound provider
│   ├── ui/
│   │   ├── theme-toggle.tsx        # Theme toggle
│   │   └── sound-settings.tsx      # Sound settings
│   └── kitchen/
│       ├── kitchen-kanban.tsx      # Kanban with DnD
│       └── draggable-order-card.tsx # Draggable card
public/
└── sounds/
    ├── notification.mp3            # Notification sound
    ├── success.mp3                 # Success sound
    └── error.mp3                   # Error sound
```

---

## 7. Technical Considerations

### Performance
- ThemeProvider uses localStorage for instant persistence
- SoundProvider preloads audio for immediate playback
- DnD uses PointerSensor with a minimum distance to avoid accidental clicks

### Accessibility
- Theme follows the system preference by default
- Sounds can be fully disabled
- Drag and drop has a button fallback

### Mobile
- ThemeToggle is responsive, with icons
- Volume slider works with touch
- DnD works with touch (PointerSensor)

---

## 8. Dependencies to Install

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Approval

This plan covers the 4 requested UX improvements:
1. Light/dark theme
2. Per-user sound settings  
3. Dragging cards in the kitchen Kanban
4. Required translations

Ready for implementation after approval.
