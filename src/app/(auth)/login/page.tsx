"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/garcom";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log("Login result:", result);

      if (result?.error) {
        setError(t("invalidCredentials"));
        setLoading(false);
      } else if (result?.ok) {
        window.location.href = callbackUrl;
      } else {
        setError(t("invalidCredentials"));
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(tErrors("generic"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-animated flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/logo.svg"
              alt="aiFood Logo"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gold">aiFood</h1>
          <p className="text-muted-foreground mt-2">
            Plataforma de Atendimento
          </p>
        </div>

        {/* Card */}
        <div className="card-premium rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-foreground">
              Bem-vindo de volta
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Entre com suas credenciais
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                {t("email")}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="input-premium pl-12"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                {t("password")}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="input-premium pl-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>{t("login")}</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider-gold my-8" />

          {/* Demo credentials */}
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">Credenciais de demonstração:</p>
            <div className="space-y-1 text-xs">
              <p>
                <span className="text-foreground">Super Admin:</span>{" "}
                superadmin@aifood.com / superadmin123
              </p>
              <p>
                <span className="text-foreground">Admin:</span> admin@aifood.com
                / admin123
              </p>
              <p>
                <span className="text-foreground">Garçom:</span>{" "}
                garcom@aifood.com / garcom123
              </p>
              <p>
                <span className="text-foreground">Cozinha:</span>{" "}
                cozinha@aifood.com / cozinha123
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground/60 mt-6">
          Powered by <span className="text-gold font-semibold">aiFood</span>
        </p>
      </div>
    </div>
  );
}
