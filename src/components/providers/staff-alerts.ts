"use client";

import { useCallback, useEffect } from "react";
import { useSound } from "./sound-provider";

// Keep the screen on while a staff screen is open. The lock drops whenever the
// tab is hidden, so it is requested again when the page becomes visible.
export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;

    const request = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // denied (battery saver, iframe): the page still works
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}

// Sound (respects the sound settings) plus vibration where supported
export function useStaffAlert() {
  const { playNotification } = useSound();
  return useCallback(() => {
    playNotification();
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      // some browsers throw without a prior user gesture
    }
  }, [playNotification]);
}
