"use client";

import Image from "next/image";
import { useTheme } from "@/components/providers/theme-provider";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { width: 32, height: 32, text: "text-lg" },
  md: { width: 40, height: 40, text: "text-xl" },
  lg: { width: 48, height: 48, text: "text-2xl" },
  xl: { width: 64, height: 64, text: "text-3xl" },
};

export function Logo({
  size = "md",
  showText = true,
  className = "",
}: LogoProps) {
  const { resolvedTheme } = useTheme();
  const { width, height, text } = sizes[size];

  const logoSrc =
    resolvedTheme === "dark" ? "/logo.svg" : "/logo.svg";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src={logoSrc}
        alt="aiFood Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
      {showText && (
        <span className={`font-bold text-gold ${text}`}>aiFood</span>
      )}
    </div>
  );
}

// Versão para header com fundo escuro (admin/cozinha)
export function LogoWhite({
  size = "md",
  showText = true,
  className = "",
}: LogoProps) {
  const { width, height, text } = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.svg"
        alt="aiFood Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
      {showText && (
        <span className={`font-bold text-white ${text}`}>aiFood</span>
      )}
    </div>
  );
}
