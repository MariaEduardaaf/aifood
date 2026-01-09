"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

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
  const [mounted, setMounted] = useState(false);

  const notificationRef = useRef<HTMLAudioElement | null>(null);
  const successRef = useRef<HTMLAudioElement | null>(null);
  const errorRef = useRef<HTMLAudioElement | null>(null);

  // Carregar configuracoes e inicializar audios
  useEffect(() => {
    setMounted(true);

    // Carregar configuracoes salvas
    const saved = localStorage.getItem("visionary-sound-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        // Ignorar erro de parse
      }
    }

    // Inicializar audios
    notificationRef.current = new Audio("/sounds/notification.mp3");
    successRef.current = new Audio("/sounds/success.mp3");
    errorRef.current = new Audio("/sounds/error.mp3");

    // Pre-load audios
    notificationRef.current.load();
    successRef.current.load();
    errorRef.current.load();
  }, []);

  // Atualizar volume dos audios quando mudar
  useEffect(() => {
    if (!mounted) return;

    const volume = settings.volume / 100;
    if (notificationRef.current) notificationRef.current.volume = volume;
    if (successRef.current) successRef.current.volume = volume;
    if (errorRef.current) errorRef.current.volume = volume;
  }, [settings.volume, mounted]);

  const updateSettings = useCallback((newSettings: Partial<SoundSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem("visionary-sound-settings", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const playSound = useCallback(
    (audio: HTMLAudioElement | null) => {
      if (!settings.enabled || !audio) return;

      // Reset e play
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Ignorar erros de autoplay (browser pode bloquear)
      });
    },
    [settings.enabled],
  );

  const playNotification = useCallback(() => {
    playSound(notificationRef.current);
  }, [playSound]);

  const playSuccess = useCallback(() => {
    playSound(successRef.current);
  }, [playSound]);

  const playError = useCallback(() => {
    playSound(errorRef.current);
  }, [playSound]);

  return (
    <SoundContext.Provider
      value={{
        settings,
        updateSettings,
        playNotification,
        playSuccess,
        playError,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSound must be used within a SoundProvider");
  }
  return context;
}
