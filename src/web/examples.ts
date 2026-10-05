/** Fixed example texts of the document checker (examples.test.ts checks which findings each one produces). */
import type { Lang, Pair } from "./i18n.js";

export interface AuditExample {
  id: "vendor" | "policy" | "post";
  label: Pair;
  lang: Lang;
  text: string;
}

export const EXAMPLES: readonly AuditExample[] = [
  {
    id: "vendor",
    label: { en: "Vendor answer (English)", de: "Anbieterantwort (Englisch)" },
    lang: "en",
    text: [
      "Thank you for your questionnaire. Our position on the EU AI Act is as follows.",
      "The requirements for high-risk AI systems under Article 6(2) and Annex III apply from 2 August 2026, so our documentation is being finalised now.",
      "For bias testing we rely on Article 10(5), which allows us to process special categories of personal data.",
      "The transparency duties of Article 50 apply from 2 August 2026.",
      'Article 14(1) states: "High-risk AI systems shall be designed and developed in such a way, including with appropriate human-machine interface tools, that they can be effectively overseen by natural persons during the period in which they are in use."',
    ].join("\n\n"),
  },
  {
    id: "policy",
    label: { en: "Company policy (German)", de: "Unternehmensrichtlinie (Deutsch)" },
    lang: "de",
    text: [
      "Richtlinie zum Einsatz von KI-Systemen, Abschnitt 4: Regulatorische Grundlagen",
      "Nach Art. 6 Abs. 2 i. V. m. Anhang III der KI-Verordnung gelten die Pflichten für Hochrisiko-KI-Systeme ab dem 2. August 2026. Wir planen die Umsetzung entsprechend.",
      "Zu den Reallaboren heißt es in Artikel 57 Absatz 1: „Die Mitgliedstaaten sorgen dafür, dass ihre zuständigen Behörden mindestens ein KI-Reallabor auf nationaler Ebene einrichten, das bis zum 2. August 2026 einsatzbereit sein muss.“",
    ].join("\n\n"),
  },
  {
    id: "post",
    label: { en: "LinkedIn post (English)", de: "LinkedIn-Beitrag (Englisch)" },
    lang: "en",
    text: [
      "Big news for everyone building with AI! Article 999 of the AI Act now bans every chatbot in Europe. #AIAct #compliance",
      'Meanwhile, Article 14(1) says: "High-risk AI systems shall be designed and developed in such a way, including with appropriate human-machine interface tools, that they can be properly overseen by natural persons during the period in which they are in use."',
    ].join("\n\n"),
  },
];
