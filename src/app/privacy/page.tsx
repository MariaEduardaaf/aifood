// TEMPLATE TEXT: generic RGPD/LOPDGDD privacy notice for a venue using aiFood.
// Review with a lawyer (and adapt to each restaurant) before going live.
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { LegalPage, type LegalSection } from "@/components/client/legal-page";

type Doc = { title: string; updated: string; intro: string; sections: LegalSection[] };

const UPDATED = { es: "16 de octubre de 2026", en: "16 October 2026" };

const content: Record<"es" | "en", Doc> = {
  es: {
    title: "Política de privacidad",
    updated: UPDATED.es,
    intro:
      "Esta página explica qué datos se tratan cuando usas la carta digital de la mesa para ver el menú, hacer un pedido, llamar al camarero, pedir la cuenta o valorar el servicio. No necesitas crear una cuenta ni darnos tu nombre.",
    sections: [
      {
        heading: "Quién es responsable",
        paragraphs: [
          "El responsable del tratamiento es el establecimiento en el que te encuentras. Puedes pedir sus datos de contacto al personal o consultarlos en el local.",
          "aiFood presta el servicio tecnológico como encargado del tratamiento, por cuenta del establecimiento y siguiendo sus instrucciones.",
        ],
      },
      {
        heading: "Qué datos tratamos",
        paragraphs: [
          "Datos de uso de la mesa: los platos que pides, las notas que añades, las llamadas al camarero, las solicitudes de cuenta y la hora de cada acción. Se asocian a la mesa, no a tu identidad.",
          "Valoraciones: las estrellas y, si decides escribirlo, tu comentario. Te recomendamos no incluir datos personales en el comentario.",
          "Datos técnicos: la dirección IP y el tipo de navegador, que los servidores registran para mantener el servicio seguro y evitar abusos.",
        ],
      },
      {
        heading: "Para qué y con qué base legal",
        paragraphs: [
          "Preparar y servir tu pedido y atender tus llamadas, porque es necesario para prestarte el servicio que solicitas (art. 6.1.b RGPD).",
          "Mejorar el servicio con las valoraciones y estadísticas agregadas, y proteger el sistema frente a abusos, por interés legítimo del establecimiento (art. 6.1.f RGPD).",
          "Cumplir obligaciones legales, por ejemplo fiscales o de información sobre alérgenos (art. 6.1.c RGPD).",
        ],
      },
      {
        heading: "Cuánto tiempo",
        paragraphs: [
          "Los pedidos y llamadas se conservan el tiempo necesario para gestionarlos y, después, durante los plazos que exija la ley. Los registros técnicos se eliminan en un plazo breve, salvo que se necesiten para investigar un incidente.",
        ],
      },
      {
        heading: "Con quién se comparten",
        paragraphs: [
          "Solo con los proveedores que alojan el servicio y las imágenes del menú, con contratos que les obligan a proteger los datos. No vendemos datos ni los usamos para publicidad.",
          "Si al valorar eliges dejar una reseña en Google, saldrás de esta página y se aplicará la política de privacidad de Google.",
        ],
      },
      {
        heading: "Tus derechos",
        paragraphs: [
          "Puedes pedir acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad dirigiéndote al establecimiento. Si crees que no se han atendido bien tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).",
        ],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    updated: UPDATED.en,
    intro:
      "This page explains what data is processed when you use the table's digital menu to browse, place an order, call a waiter, ask for the bill or rate the service. You do not need an account and we do not ask for your name.",
    sections: [
      {
        heading: "Who is responsible",
        paragraphs: [
          "The data controller is the venue you are in. You can ask the staff for its contact details or find them at the premises.",
          "aiFood provides the technology as a data processor, on behalf of the venue and following its instructions.",
        ],
      },
      {
        heading: "What data we process",
        paragraphs: [
          "Table activity: the dishes you order, the notes you add, waiter calls, bill requests and the time of each action. It is linked to the table, not to your identity.",
          "Ratings: the stars and, if you choose to write one, your comment. Please do not include personal data in the comment.",
          "Technical data: the IP address and browser type, which the servers log to keep the service secure and prevent abuse.",
        ],
      },
      {
        heading: "Why, and on what legal basis",
        paragraphs: [
          "To prepare and serve your order and answer your calls, because it is necessary to provide the service you ask for (Art. 6.1.b GDPR).",
          "To improve the service with ratings and aggregated statistics, and to protect the system from abuse, based on the venue's legitimate interest (Art. 6.1.f GDPR).",
          "To meet legal obligations, such as tax rules or allergen information (Art. 6.1.c GDPR).",
        ],
      },
      {
        heading: "How long",
        paragraphs: [
          "Orders and calls are kept for as long as needed to handle them and then for the periods the law requires. Technical logs are deleted after a short time unless they are needed to investigate an incident.",
        ],
      },
      {
        heading: "Who we share it with",
        paragraphs: [
          "Only with the providers that host the service and the menu images, under contracts that require them to protect the data. We do not sell data or use it for advertising.",
          "If you choose to leave a Google review after rating, you leave this page and Google's privacy policy applies.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You can ask the venue for access, rectification, erasure, objection, restriction and portability. If you think your rights were not handled properly, you can complain to the Spanish Data Protection Agency (www.aepd.es).",
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

export default async function PrivacyPage() {
  return <LegalPage {...await pick()} />;
}
