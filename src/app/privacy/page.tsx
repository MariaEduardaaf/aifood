// TEMPLATE TEXT: generic RGPD/LOPDGDD privacy notice for a venue using aiFood.
// Review with a lawyer (and adapt to each restaurant) before going live.
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { LegalPage, type LegalSection } from "@/components/client/legal-page";
import { isLocale, type Locale } from "@/lib/i18n/locales";

type Doc = { title: string; intro: string; sections: LegalSection[] };

const UPDATED = new Date("2026-10-16T00:00:00Z");

const content: Record<Locale, Doc> = {
  es: {
    title: "Política de privacidad",
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
  pt: {
    title: "Política de privacidade",
    intro:
      "Esta página explica quais dados são tratados quando você usa o cardápio digital da mesa para ver o menu, fazer um pedido, chamar o garçom, pedir a conta ou avaliar o atendimento. Você não precisa criar uma conta nem informar seu nome.",
    sections: [
      {
        heading: "Quem é o responsável",
        paragraphs: [
          "O responsável pelo tratamento é o estabelecimento em que você está. Você pode pedir os dados de contato dele à equipe ou consultá-los no local.",
          "A aiFood fornece o serviço tecnológico como subcontratante (operadora), em nome do estabelecimento e seguindo as instruções dele.",
        ],
      },
      {
        heading: "Quais dados tratamos",
        paragraphs: [
          "Uso da mesa: os pratos que você pede, as observações que acrescenta, as chamadas ao garçom, os pedidos de conta e o horário de cada ação. Esses dados ficam associados à mesa, não à sua identidade.",
          "Avaliações: as estrelas e, se você quiser escrever, o seu comentário. Recomendamos não incluir dados pessoais no comentário.",
          "Dados técnicos: o endereço IP e o tipo de navegador, que os servidores registram para manter o serviço seguro e evitar abusos.",
        ],
      },
      {
        heading: "Para quê e com que base legal",
        paragraphs: [
          "Preparar e servir o seu pedido e atender às suas chamadas, porque isso é necessário para prestar o serviço que você solicita (art. 6.º, n.º 1, alínea b) do RGPD).",
          "Melhorar o serviço com as avaliações e estatísticas agregadas, e proteger o sistema contra abusos, com base no interesse legítimo do estabelecimento (art. 6.º, n.º 1, alínea f) do RGPD).",
          "Cumprir obrigações legais, por exemplo fiscais ou de informação sobre alergênicos (art. 6.º, n.º 1, alínea c) do RGPD).",
        ],
      },
      {
        heading: "Por quanto tempo",
        paragraphs: [
          "Os pedidos e as chamadas são guardados pelo tempo necessário para geri-los e, depois, pelos prazos que a lei exigir. Os registros técnicos são apagados em pouco tempo, a menos que sejam necessários para investigar um incidente.",
        ],
      },
      {
        heading: "Com quem são compartilhados",
        paragraphs: [
          "Apenas com os fornecedores que hospedam o serviço e as imagens do cardápio, com contratos que os obrigam a proteger os dados. Não vendemos dados nem os usamos para publicidade.",
          "Se, ao avaliar, você escolher deixar uma avaliação no Google, sairá desta página e passará a valer a política de privacidade do Google.",
        ],
      },
      {
        heading: "Os seus direitos",
        paragraphs: [
          "Você pode pedir ao estabelecimento acesso, retificação, apagamento, oposição, limitação do tratamento e portabilidade. Se achar que os seus direitos não foram bem atendidos, pode apresentar reclamação à autoridade espanhola de proteção de dados, a Agencia Española de Protección de Datos (www.aepd.es).",
        ],
      },
    ],
  },
  de: {
    title: "Datenschutzerklärung",
    intro:
      "Diese Seite erklärt, welche Daten verarbeitet werden, wenn Sie die digitale Speisekarte am Tisch nutzen, um das Menü anzusehen, zu bestellen, die Bedienung zu rufen, um die Rechnung zu bitten oder den Service zu bewerten. Sie brauchen kein Konto und müssen uns Ihren Namen nicht nennen.",
    sections: [
      {
        heading: "Wer verantwortlich ist",
        paragraphs: [
          "Verantwortlicher für die Verarbeitung ist das Lokal, in dem Sie sich befinden. Die Kontaktdaten erhalten Sie beim Personal oder vor Ort.",
          "aiFood stellt die Technik als Auftragsverarbeiter bereit, im Auftrag des Lokals und nach dessen Weisungen.",
        ],
      },
      {
        heading: "Welche Daten wir verarbeiten",
        paragraphs: [
          "Nutzung am Tisch: die bestellten Gerichte, Ihre Anmerkungen, Rufe nach der Bedienung, Rechnungsanfragen und der Zeitpunkt jeder Aktion. Diese Daten sind dem Tisch zugeordnet, nicht Ihrer Person.",
          "Bewertungen: die Sterne und, falls Sie einen schreiben, Ihr Kommentar. Bitte geben Sie im Kommentar keine personenbezogenen Daten an.",
          "Technische Daten: IP-Adresse und Browsertyp, die die Server protokollieren, um den Dienst sicher zu halten und Missbrauch zu verhindern.",
        ],
      },
      {
        heading: "Zwecke und Rechtsgrundlagen",
        paragraphs: [
          "Ihre Bestellung zubereiten und servieren und auf Ihre Rufe reagieren, weil dies für den von Ihnen gewünschten Service erforderlich ist (Art. 6 Abs. 1 lit. b DSGVO).",
          "Den Service mit Bewertungen und zusammengefassten Statistiken verbessern und das System vor Missbrauch schützen, auf Grundlage des berechtigten Interesses des Lokals (Art. 6 Abs. 1 lit. f DSGVO).",
          "Gesetzliche Pflichten erfüllen, etwa steuerliche Pflichten oder die Information über Allergene (Art. 6 Abs. 1 lit. c DSGVO).",
        ],
      },
      {
        heading: "Speicherdauer",
        paragraphs: [
          "Bestellungen und Rufe werden so lange gespeichert, wie es für ihre Bearbeitung nötig ist, und danach für die gesetzlich vorgeschriebenen Fristen. Technische Protokolle werden nach kurzer Zeit gelöscht, sofern sie nicht zur Aufklärung eines Vorfalls benötigt werden.",
        ],
      },
      {
        heading: "An wen Daten weitergegeben werden",
        paragraphs: [
          "Nur an die Anbieter, die den Dienst und die Bilder der Speisekarte hosten, mit Verträgen, die sie zum Schutz der Daten verpflichten. Wir verkaufen keine Daten und nutzen sie nicht für Werbung.",
          "Wenn Sie nach der Bewertung eine Google-Rezension hinterlassen, verlassen Sie diese Seite, und es gilt die Datenschutzerklärung von Google.",
        ],
      },
      {
        heading: "Ihre Rechte",
        paragraphs: [
          "Sie können beim Lokal Auskunft, Berichtigung, Löschung, Widerspruch, Einschränkung der Verarbeitung und Datenübertragbarkeit verlangen. Wenn Sie meinen, dass Ihre Rechte nicht richtig beachtet wurden, können Sie sich bei der spanischen Datenschutzbehörde beschweren, der Agencia Española de Protección de Datos (www.aepd.es).",
        ],
      },
    ],
  },
  nl: {
    title: "Privacybeleid",
    intro:
      "Op deze pagina lees je welke gegevens worden verwerkt als je de digitale menukaart aan tafel gebruikt om het menu te bekijken, te bestellen, de bediening te roepen, om de rekening te vragen of de service te beoordelen. Je hebt geen account nodig en we vragen niet om je naam.",
    sections: [
      {
        heading: "Wie is verantwoordelijk",
        paragraphs: [
          "De verwerkingsverantwoordelijke is de zaak waar je bent. Je kunt de contactgegevens aan het personeel vragen of ter plaatse vinden.",
          "aiFood levert de technologie als verwerker, namens de zaak en volgens haar instructies.",
        ],
      },
      {
        heading: "Welke gegevens we verwerken",
        paragraphs: [
          "Gebruik aan tafel: de gerechten die je bestelt, de opmerkingen die je toevoegt, oproepen aan de bediening, verzoeken om de rekening en het tijdstip van elke actie. Deze gegevens zijn gekoppeld aan de tafel, niet aan jou als persoon.",
          "Beoordelingen: de sterren en, als je die schrijft, je opmerking. Zet liever geen persoonsgegevens in je opmerking.",
          "Technische gegevens: het IP-adres en het type browser, die de servers vastleggen om de dienst veilig te houden en misbruik te voorkomen.",
        ],
      },
      {
        heading: "Waarvoor en op welke grondslag",
        paragraphs: [
          "Je bestelling bereiden en serveren en op je oproepen reageren, omdat dat nodig is voor de dienst die je vraagt (art. 6 lid 1 sub b AVG).",
          "De service verbeteren met beoordelingen en geaggregeerde statistieken, en het systeem beschermen tegen misbruik, op grond van het gerechtvaardigd belang van de zaak (art. 6 lid 1 sub f AVG).",
          "Wettelijke verplichtingen nakomen, bijvoorbeeld fiscale regels of informatie over allergenen (art. 6 lid 1 sub c AVG).",
        ],
      },
      {
        heading: "Hoe lang",
        paragraphs: [
          "Bestellingen en oproepen worden bewaard zolang dat nodig is om ze af te handelen en daarna gedurende de wettelijke termijnen. Technische logs worden na korte tijd verwijderd, tenzij ze nodig zijn om een incident te onderzoeken.",
        ],
      },
      {
        heading: "Met wie ze worden gedeeld",
        paragraphs: [
          "Alleen met de leveranciers die de dienst en de afbeeldingen van het menu hosten, met contracten die hen verplichten de gegevens te beschermen. We verkopen geen gegevens en gebruiken ze niet voor reclame.",
          "Als je na je beoordeling een Google-review achterlaat, verlaat je deze pagina en geldt het privacybeleid van Google.",
        ],
      },
      {
        heading: "Je rechten",
        paragraphs: [
          "Je kunt de zaak vragen om inzage, rectificatie, verwijdering, bezwaar, beperking van de verwerking en overdraagbaarheid. Vind je dat je rechten niet goed zijn behandeld, dan kun je een klacht indienen bij de Spaanse toezichthouder, de Agencia Española de Protección de Datos (www.aepd.es).",
        ],
      },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    intro:
      "Cette page explique quelles données sont traitées lorsque vous utilisez la carte numérique de la table pour consulter le menu, passer commande, appeler un serveur, demander l'addition ou noter le service. Vous n'avez pas besoin de créer de compte ni de nous donner votre nom.",
    sections: [
      {
        heading: "Qui est responsable",
        paragraphs: [
          "Le responsable du traitement est l'établissement dans lequel vous vous trouvez. Vous pouvez demander ses coordonnées au personnel ou les consulter sur place.",
          "aiFood fournit le service technique en tant que sous-traitant, pour le compte de l'établissement et selon ses instructions.",
        ],
      },
      {
        heading: "Quelles données nous traitons",
        paragraphs: [
          "Utilisation de la table : les plats que vous commandez, les remarques que vous ajoutez, les appels au serveur, les demandes d'addition et l'heure de chaque action. Elles sont liées à la table, pas à votre identité.",
          "Avis : les étoiles et, si vous choisissez d'en écrire un, votre commentaire. Nous vous conseillons de ne pas y inclure de données personnelles.",
          "Données techniques : l'adresse IP et le type de navigateur, que les serveurs enregistrent pour sécuriser le service et prévenir les abus.",
        ],
      },
      {
        heading: "Finalités et bases légales",
        paragraphs: [
          "Préparer et servir votre commande et répondre à vos appels, car c'est nécessaire pour fournir le service que vous demandez (art. 6.1.b du RGPD).",
          "Améliorer le service grâce aux avis et aux statistiques agrégées, et protéger le système contre les abus, sur la base de l'intérêt légitime de l'établissement (art. 6.1.f du RGPD).",
          "Respecter des obligations légales, par exemple fiscales ou d'information sur les allergènes (art. 6.1.c du RGPD).",
        ],
      },
      {
        heading: "Durée de conservation",
        paragraphs: [
          "Les commandes et les appels sont conservés le temps nécessaire à leur traitement, puis pendant les durées imposées par la loi. Les journaux techniques sont supprimés après une courte période, sauf s'ils sont nécessaires pour enquêter sur un incident.",
        ],
      },
      {
        heading: "Avec qui elles sont partagées",
        paragraphs: [
          "Uniquement avec les prestataires qui hébergent le service et les images du menu, liés par des contrats qui les obligent à protéger les données. Nous ne vendons pas de données et ne les utilisons pas à des fins publicitaires.",
          "Si, après avoir noté le service, vous choisissez de laisser un avis sur Google, vous quittez cette page et la politique de confidentialité de Google s'applique.",
        ],
      },
      {
        heading: "Vos droits",
        paragraphs: [
          "Vous pouvez demander à l'établissement l'accès, la rectification, l'effacement, l'opposition, la limitation du traitement et la portabilité. Si vous estimez que vos droits n'ont pas été respectés, vous pouvez adresser une réclamation à l'autorité espagnole de protection des données, l'Agencia Española de Protección de Datos (www.aepd.es).",
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

export default async function PrivacyPage() {
  return <LegalPage {...await pick()} />;
}
