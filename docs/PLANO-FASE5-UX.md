# Plano de Implementacao - Fase 5: Melhorias de UX

> **Status:** ✅ 100% IMPLEMENTADO  
> **Data de conclusão:** 2026-01-08  
> **Dependencias:** Fase 4 (Cozinha) concluida

## Visao Geral

Implementar melhorias de experiencia do usuario focadas em personalizacao, acessibilidade e usabilidade do sistema.

---

## 1. Tema Claro/Escuro

### 1.1 Objetivo
Permitir que usuarios alternem entre tema claro e escuro, com persistencia da preferencia.

### 1.2 Implementacao

#### Criar ThemeProvider
Localizacao: `src/components/providers/theme-provider.tsx`

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
    // Carregar tema salvo
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    // Aplicar tema
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

#### Criar ThemeToggle
Localizacao: `src/components/ui/theme-toggle.tsx`

```typescript
"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light", icon: Sun, label: "Claro" },
    { value: "dark", icon: Moon, label: "Escuro" },
    { value: "system", icon: Monitor, label: "Sistema" },
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

#### Atualizar CSS (globals.css)
Adicionar variaveis para tema claro:

```css
:root {
  /* Tema claro */
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
  /* Tema escuro (atual) */
  --background: 224 71% 4%;
  --foreground: 213 31% 91%;
  /* ... resto das variaveis atuais ... */
}
```

#### Arquivos a modificar
1. `src/app/layout.tsx` - Envolver com ThemeProvider
2. `src/app/globals.css` - Adicionar variaveis do tema claro
3. `src/components/waiter/waiter-header.tsx` - Adicionar ThemeToggle
4. `src/components/kitchen/kitchen-page.tsx` - Adicionar ThemeToggle
5. `src/components/admin/sidebar.tsx` - Adicionar ThemeToggle

---

## 2. Configuracoes de Som por Usuario

### 2.1 Objetivo
Permitir que cada usuario configure volume e ative/desative sons de notificacao.

### 2.2 Implementacao

#### Criar SoundProvider
Localizacao: `src/components/providers/sound-provider.tsx`

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
    // Carregar configuracoes salvas
    const saved = localStorage.getItem("soundSettings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }

    // Inicializar audios
    notificationRef.current = new Audio("/sounds/notification.mp3");
    successRef.current = new Audio("/sounds/success.mp3");
    errorRef.current = new Audio("/sounds/error.mp3");
  }, []);

  useEffect(() => {
    // Atualizar volume dos audios
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

#### Criar SoundSettings Component
Localizacao: `src/components/ui/sound-settings.tsx`

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

#### Arquivos de audio necessarios
Criar/adicionar em `public/sounds/`:
- `notification.mp3` - Som de novo pedido
- `success.mp3` - Som de acao concluida
- `error.mp3` - Som de erro

#### Arquivos a modificar
1. `src/app/layout.tsx` - Envolver com SoundProvider
2. `src/components/kitchen/kitchen-panel.tsx` - Usar useSound() ao inves de audio direto
3. `src/components/waiter/orders-panel.tsx` - Usar useSound() ao inves de audio direto

---

## 3. Drag and Drop no Kanban da Cozinha

### 3.1 Objetivo
Permitir arrastar cards entre colunas no painel da cozinha para atualizar status.

### 3.2 Implementacao

#### Instalar dependencia
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

#### Criar KitchenKanban com DnD
Localizacao: `src/components/kitchen/kitchen-kanban.tsx`

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

// Colunas do Kanban
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
        distance: 8, // Minimo de 8px para iniciar drag
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

    // Validar transicao de status
    const validTransitions: Record<string, string[]> = {
      CONFIRMED: ["PREPARING"],
      PREPARING: ["READY"],
      READY: [], // Nao pode arrastar de READY
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

#### Criar DraggableOrderCard
Localizacao: `src/components/kitchen/draggable-order-card.tsx`

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

#### Arquivos a modificar
1. `package.json` - Adicionar @dnd-kit dependencias
2. `src/components/kitchen/kitchen-panel.tsx` - Integrar DnD ou substituir por kitchen-kanban.tsx

---

## 4. Traducoes para Configuracoes

### 4.1 Adicionar em messages/pt.json

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

### 4.2 Adicionar em messages/es.json

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

### 4.3 Adicionar em messages/en.json

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

## 5. Ordem de Implementacao

### Etapa 1: Infraestrutura de Providers
1. [x] Criar `src/components/providers/theme-provider.tsx`
2. [x] Criar `src/components/providers/sound-provider.tsx`
3. [x] Atualizar `src/app/layout.tsx` com providers

### Etapa 2: Tema Claro/Escuro
4. [x] Atualizar `src/app/globals.css` com variaveis do tema claro
5. [x] Criar `src/components/ui/theme-toggle.tsx`
6. [x] Adicionar ThemeToggle no header do garcom
7. [x] Adicionar ThemeToggle no header da cozinha
8. [x] Adicionar ThemeToggle no sidebar do admin

### Etapa 3: Configuracoes de Som
9. [x] Adicionar arquivos de audio em `public/sounds/`
10. [x] Criar `src/components/ui/sound-settings.tsx`
11. [x] Atualizar `kitchen-panel.tsx` para usar SoundProvider
12. [x] Atualizar `orders-panel.tsx` para usar SoundProvider
13. [x] Criar SoundToggleCompact para headers

### Etapa 4: Drag and Drop na Cozinha
14. [x] Instalar `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
15. [x] Criar `src/components/kitchen/kitchen-kanban.tsx`
16. [x] Integrar DnD com cards arrastaveis
17. [x] Integrar DnD no painel da cozinha (toggle Kanban/Lista)

### Etapa 5: Traducoes e Ajustes Finais
18. [x] Adicionar traducoes de settings em PT/ES/EN
19. [x] TypeScript compila sem erros
20. [x] Sons e tema funcionando
21. [x] Drag and drop na cozinha funcionando

---

## 6. Estrutura de Arquivos (Novos)

```
src/
├── components/
│   ├── providers/
│   │   ├── theme-provider.tsx      # Provider de tema
│   │   └── sound-provider.tsx      # Provider de som
│   ├── ui/
│   │   ├── theme-toggle.tsx        # Toggle de tema
│   │   └── sound-settings.tsx      # Configuracoes de som
│   └── kitchen/
│       ├── kitchen-kanban.tsx      # Kanban com DnD
│       └── draggable-order-card.tsx # Card arrastavel
public/
└── sounds/
    ├── notification.mp3            # Som de notificacao
    ├── success.mp3                 # Som de sucesso
    └── error.mp3                   # Som de erro
```

---

## 7. Consideracoes Tecnicas

### Performance
- ThemeProvider usa localStorage para persistencia instantanea
- SoundProvider pre-carrega audios para reproducao imediata
- DnD usa PointerSensor com distancia minima para evitar cliques acidentais

### Acessibilidade
- Tema segue preferencia do sistema por padrao
- Sons podem ser completamente desativados
- Drag and drop tem fallback com botoes

### Mobile
- ThemeToggle responsivo com icones
- Volume slider funciona com touch
- DnD funciona com touch (PointerSensor)

---

## 8. Dependencias a Instalar

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Aprovacao

Este plano cobre as 4 melhorias de UX solicitadas:
1. Tema claro/escuro
2. Configuracoes de som por usuario  
3. Arrastar cards no Kanban da cozinha
4. Traducoes necessarias

Pronto para implementacao apos aprovacao.
