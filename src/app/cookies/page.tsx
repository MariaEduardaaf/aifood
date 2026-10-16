// TEMPLATE TEXT: cookie notice for the current setup (technical storage only,
// no analytics or advertising). Review with a lawyer before going live, and
// revisit it (plus a consent banner) if any analytics or ads are ever added.
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { LegalPage, type LegalSection } from "@/components/client/legal-page";
import { isLocale, type Locale } from "@/lib/i18n/locales";

type Doc = { title: string; intro: string; sections: LegalSection[] };

const UPDATED = new Date("2026-10-16T00:00:00Z");

const content: Record<Locale, Doc> = {
  es: {
    title: "Política de cookies",
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
  pt: {
    title: "Política de cookies",
    intro:
      "Este cardápio digital usa apenas cookies e armazenamento do navegador estritamente necessários para funcionar. Não usamos cookies de análise, de publicidade nem de terceiros, por isso não pedimos o seu consentimento (art. 22.2 da LSSI espanhola).",
    sections: [
      {
        heading: "Cookies que usamos",
        paragraphs: [
          "locale: guarda o idioma que você escolhe para o cardápio. Duração: um ano.",
          "__Secure-authjs.session-token: mantém a equipe do estabelecimento conectada ao painel. Duração: até 12 horas.",
          "__Host-authjs.csrf-token e __Secure-authjs.callback-url: protegem o login da equipe e lembram para qual página voltar. Duração: a da sessão do navegador.",
          "Os cookies authjs só são criados quando a equipe faz login; os clientes que consultam o cardápio nunca os recebem.",
        ],
      },
      {
        heading: "Armazenamento do navegador",
        paragraphs: [
          "aifood-hide-allergens (sessionStorage): lembra os alergênicos que você escolheu ocultar enquanto a aba estiver aberta.",
          "aifood-rated-… (localStorage): evita pedir de novo uma avaliação que você já deu ou pulou.",
          "aifood-sa-restaurant (localStorage): lembra qual estabelecimento o administrador da plataforma está gerindo. Só no painel dele.",
          "visionary-theme e visionary-sound-settings (localStorage): preferências de tema e de som, só nos painéis da equipe.",
        ],
      },
      {
        heading: "Como apagá-los",
        paragraphs: [
          "Você pode apagar os cookies e o armazenamento nas configurações do navegador a qualquer momento. O cardápio continua funcionando; só esquece as suas preferências.",
        ],
      },
    ],
  },
  de: {
    title: "Cookie-Richtlinie",
    intro:
      "Diese digitale Speisekarte verwendet nur Cookies und Browserspeicher, die für den Betrieb unbedingt erforderlich sind. Wir setzen keine Analyse-, Werbe- oder Drittanbieter-Cookies ein und bitten deshalb nicht um Ihre Einwilligung (Art. 22.2 des spanischen LSSI).",
    sections: [
      {
        heading: "Cookies, die wir verwenden",
        paragraphs: [
          "locale: speichert die Sprache, die Sie für die Speisekarte wählen. Dauer: ein Jahr.",
          "__Secure-authjs.session-token: hält das Personal des Lokals im Dashboard angemeldet. Dauer: bis zu 12 Stunden.",
          "__Host-authjs.csrf-token und __Secure-authjs.callback-url: schützen die Anmeldung des Personals und merken sich, zu welcher Seite zurückgekehrt wird. Dauer: bis zum Ende der Browsersitzung.",
          "Die authjs-Cookies werden nur gesetzt, wenn sich das Personal anmeldet; Gäste, die die Speisekarte ansehen, erhalten sie nie.",
        ],
      },
      {
        heading: "Browserspeicher",
        paragraphs: [
          "aifood-hide-allergens (sessionStorage): merkt sich, welche Allergene Sie ausblenden möchten, solange der Tab geöffnet ist.",
          "aifood-rated-… (localStorage): verhindert, dass Sie erneut um eine Bewertung gebeten werden, die Sie schon abgegeben oder übersprungen haben.",
          "aifood-sa-restaurant (localStorage): merkt sich, welches Lokal der Plattform-Administrator gerade verwaltet. Nur in dessen Dashboard.",
          "visionary-theme und visionary-sound-settings (localStorage): Einstellungen für Design und Ton, nur in den Dashboards des Personals.",
        ],
      },
      {
        heading: "So löschen Sie sie",
        paragraphs: [
          "Sie können Cookies und Browserspeicher jederzeit in den Einstellungen Ihres Browsers löschen. Die Speisekarte funktioniert weiter; sie vergisst nur Ihre Einstellungen.",
        ],
      },
    ],
  },
  nl: {
    title: "Cookiebeleid",
    intro:
      "Deze digitale menukaart gebruikt alleen cookies en browseropslag die strikt noodzakelijk zijn om te werken. We gebruiken geen analytische, advertentie- of third-party cookies, daarom vragen we je niet om toestemming (art. 22.2 van de Spaanse LSSI).",
    sections: [
      {
        heading: "Cookies die we gebruiken",
        paragraphs: [
          "locale: onthoudt de taal die je voor de menukaart kiest. Bewaartermijn: een jaar.",
          "__Secure-authjs.session-token: houdt het personeel van de zaak ingelogd in het dashboard. Bewaartermijn: maximaal 12 uur.",
          "__Host-authjs.csrf-token en __Secure-authjs.callback-url: beveiligen het inloggen van het personeel en onthouden naar welke pagina je terugkeert. Bewaartermijn: tot de browsersessie eindigt.",
          "De authjs-cookies worden alleen geplaatst als het personeel inlogt; gasten die de menukaart bekijken krijgen ze nooit.",
        ],
      },
      {
        heading: "Browseropslag",
        paragraphs: [
          "aifood-hide-allergens (sessionStorage): onthoudt welke allergenen je wilt verbergen zolang het tabblad open is.",
          "aifood-rated-… (localStorage): voorkomt dat we opnieuw om een beoordeling vragen die je al gaf of oversloeg.",
          "aifood-sa-restaurant (localStorage): onthoudt welke zaak de platformbeheerder beheert. Alleen in diens dashboard.",
          "visionary-theme en visionary-sound-settings (localStorage): voorkeuren voor thema en geluid, alleen in de dashboards van het personeel.",
        ],
      },
      {
        heading: "Zo verwijder je ze",
        paragraphs: [
          "Je kunt cookies en opslag op elk moment verwijderen via de instellingen van je browser. De menukaart blijft werken; alleen je voorkeuren worden vergeten.",
        ],
      },
    ],
  },
  fr: {
    title: "Politique relative aux cookies",
    intro:
      "Cette carte numérique n'utilise que les cookies et le stockage du navigateur strictement nécessaires à son fonctionnement. Nous n'utilisons aucun cookie de mesure d'audience, de publicité ou tiers, c'est pourquoi nous ne vous demandons pas votre consentement (art. 22.2 de la LSSI espagnole).",
    sections: [
      {
        heading: "Les cookies que nous utilisons",
        paragraphs: [
          "locale : mémorise la langue que vous choisissez pour la carte. Durée : un an.",
          "__Secure-authjs.session-token : maintient le personnel de l'établissement connecté à son tableau de bord. Durée : jusqu'à 12 heures.",
          "__Host-authjs.csrf-token et __Secure-authjs.callback-url : protègent la connexion du personnel et mémorisent la page à laquelle revenir. Durée : celle de la session du navigateur.",
          "Les cookies authjs ne sont créés que lorsque le personnel se connecte ; les clients qui consultent la carte ne les reçoivent jamais.",
        ],
      },
      {
        heading: "Stockage du navigateur",
        paragraphs: [
          "aifood-hide-allergens (sessionStorage) : mémorise les allergènes que vous avez choisi de masquer tant que l'onglet est ouvert.",
          "aifood-rated-… (localStorage) : évite de vous redemander un avis que vous avez déjà donné ou ignoré.",
          "aifood-sa-restaurant (localStorage) : mémorise l'établissement que l'administrateur de la plateforme gère. Uniquement dans son tableau de bord.",
          "visionary-theme et visionary-sound-settings (localStorage) : préférences de thème et de son, uniquement dans les tableaux de bord du personnel.",
        ],
      },
      {
        heading: "Comment les supprimer",
        paragraphs: [
          "Vous pouvez supprimer les cookies et le stockage à tout moment dans les paramètres de votre navigateur. La carte continue de fonctionner ; elle oublie seulement vos préférences.",
        ],
      },
    ],
  },
};

async function pick(): Promise<Doc & { updated: string }> {
  const locale = await getLocale();
  const lang: Locale = isLocale(locale) ? locale : "en";
  const updated = new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "UTC" }).format(UPDATED);
  return { ...content[lang], updated };
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await pick()).title };
}

export default async function CookiesPage() {
  return <LegalPage {...await pick()} />;
}
