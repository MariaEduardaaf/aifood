// TEMPLATE TEXT: cookie notice for the current setup (technical storage only,
// no analytics or advertising). Review with a lawyer before going live, and
// revisit it (plus a consent banner) if any analytics or ads are ever added.
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { LegalPage, type LegalSection } from "@/components/client/legal-page";

type Doc = { title: string; updated: string; intro: string; sections: LegalSection[] };

const content: Record<"es" | "en", Doc> = {
  es: {
    title: "Política de cookies",
    updated: "16 de octubre de 2026",
    intro:
      "Esta carta digital solo usa cookies y almacenamiento del navegador estrictamente necesarios para funcionar. No usamos cookies de análisis, publicidad ni de terceros, por eso no te pedimos consentimiento (art. 22.2 LSSI).",
    sections: [
      {
        heading: "Cookies que usamos",
        paragraphs: [
          "locale: guarda el idioma que eliges para la carta. Duración: un año.",
          "__Secure-authjs.session-token: mantiene abierta la sesión del personal del local en su panel. Duración: hasta 12 horas.",
          "__Host-authjs.csrf-token y __Secure-authjs.callback-url: protegen el inicio de sesión del personal y recuerdan a qué página volver. Duración: la de la sesión del navegador.",
          "Las cookies authjs solo se crean cuando el personal inicia sesión; los clientes que consultan la carta no las reciben.",
        ],
      },
      {
        heading: "Almacenamiento del navegador",
        paragraphs: [
          "aifood-locale-auto (sessionStorage): recuerda que ya adaptamos el idioma de la carta al de tu navegador, para no volver a cambiarlo mientras la pestaña está abierta.",
          "aifood-hide-allergens (sessionStorage): recuerda los alérgenos que has elegido ocultar mientras la pestaña está abierta.",
          "aifood-rated-… (localStorage): evita volver a pedirte una valoración que ya diste u omitiste.",
          "aifood-sa-restaurant (localStorage): recuerda qué local está gestionando el administrador de la plataforma. Solo en su panel.",
          "visionary-theme y visionary-sound-settings (localStorage): preferencias de tema y sonido, solo en los paneles del personal.",
        ],
      },
      {
        heading: "Cómo borrarlas",
        paragraphs: [
          "Puedes eliminar las cookies y el almacenamiento desde los ajustes de tu navegador en cualquier momento. La carta seguirá funcionando; solo olvidará tus preferencias.",
        ],
      },
    ],
  },
  en: {
    title: "Cookie policy",
    updated: "16 October 2026",
    intro:
      "This digital menu only uses cookies and browser storage that are strictly necessary for it to work. We use no analytics, advertising or third-party cookies, so we do not ask for consent (Art. 22.2 of Spain's LSSI).",
    sections: [
      {
        heading: "Cookies we use",
        paragraphs: [
          "locale: remembers the language you pick for the menu. Lasts one year.",
          "__Secure-authjs.session-token: keeps venue staff signed in to their dashboard. Lasts up to 12 hours.",
          "__Host-authjs.csrf-token and __Secure-authjs.callback-url: protect the staff sign-in and remember which page to return to. Last until the browser session ends.",
          "The authjs cookies are only set when staff sign in; guests browsing the menu never get them.",
        ],
      },
      {
        heading: "Browser storage",
        paragraphs: [
          "aifood-locale-auto (sessionStorage): remembers that the menu language was already matched to your browser, so it is not switched again while the tab is open.",
          "aifood-hide-allergens (sessionStorage): remembers the allergens you chose to hide while the tab is open.",
          "aifood-rated-… (localStorage): avoids asking again for a rating you already gave or skipped.",
          "aifood-sa-restaurant (localStorage): remembers which venue the platform administrator is managing. Their dashboard only.",
          "visionary-theme and visionary-sound-settings (localStorage): theme and sound preferences, staff dashboards only.",
        ],
      },
      {
        heading: "How to delete them",
        paragraphs: [
          "You can delete cookies and storage from your browser settings at any time. The menu keeps working; it only forgets your preferences.",
        ],
      },
    ],
  },
};

async function pick(): Promise<Doc> {
  return (await getLocale()) === "es" ? content.es : content.en;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await pick()).title };
}

export default async function CookiesPage() {
  return <LegalPage {...await pick()} />;
}
