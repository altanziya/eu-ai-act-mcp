/**
 * Plain-language labels of the obligations navigator (EN/DE, isomorphic). Every question names its provision in
 * brackets. The Annex III area headings are the headings of `anx_3.pt_N` in the corpus; web-obligations.test.ts compares
 * them with both corpus languages, so they cannot drift from the law text.
 */
import type { Pair } from "./i18n.js";

export interface FieldLabel {
  q: Pair;
  hint?: Pair;
}

export const FIELD_LABELS: Record<string, FieldLabel> = {
  role: { q: { en: "Which roles does your organisation have? Select all that apply.", de: "Welche Rollen hat Ihre Organisation? Wählen Sie alle zutreffenden aus." } },
  uses_or_provides_ai_system: {
    q: {
      en: "Does your organisation provide, use, import or distribute an AI system or model in the EU? (Article 2)",
      de: "Stellt Ihre Organisation ein KI-System oder KI-Modell in der EU bereit, nutzt, importiert oder vertreibt sie eines? (Artikel 2)",
    },
  },
  enterprise_size: { q: { en: "How large is your organisation? (Article 3, points 14a and 14b)", de: "Wie groß ist Ihre Organisation? (Artikel 3 Nummern 14a und 14b)" } },
  financial_institution: {
    q: {
      en: "Is your organisation a bank, insurer or other financial institution that is subject to EU financial-services governance rules? (Article 17(4), Article 26(5))",
      de: "Ist Ihre Organisation eine Bank, ein Versicherer oder ein anderes Finanzinstitut, für das EU-Vorschriften zur internen Unternehmensführung im Finanzsektor gelten? (Artikel 17 Absatz 4, Artikel 26 Absatz 5)",
    },
  },
  provider_in_third_country: {
    q: { en: "Is the provider of the system established outside the EU? (Article 22)", de: "Hat der Anbieter des Systems seinen Sitz außerhalb der EU? (Artikel 22)" },
  },
  placed_on_market_before: {
    q: {
      en: "When was the system or model first placed on the market or put into service? (Article 111)",
      de: "Wann wurde das System oder Modell erstmals in Verkehr gebracht oder in Betrieb genommen? (Artikel 111)",
    },
    hint: { en: "Leave empty if this has not happened yet.", de: "Leer lassen, wenn das noch nicht geschehen ist." },
  },
  significant_design_change_since_application: {
    q: {
      en: "Has the design of the system changed significantly since the high-risk rules began to apply to it? (Article 111(2))",
      de: "Wurde das System seit dem Beginn der Hochrisiko-Vorschriften in seiner Konstruktion erheblich verändert? (Artikel 111 Absatz 2)",
    },
  },
  hrai_intended_for_public_authorities: {
    q: { en: "Is the high-risk system intended to be used by public authorities? (Article 111(2))", de: "Ist das Hochrisiko-System zur Nutzung durch Behörden bestimmt? (Artikel 111 Absatz 2)" },
  },
  annex_iii_area: {
    q: {
      en: "Does the intended purpose of the system fall into one of the high-risk areas listed in Annex III? (Annex III)",
      de: "Fällt der Verwendungszweck des Systems in einen der Hochrisiko-Bereiche des Anhangs III? (Anhang III)",
    },
  },
  annex_iii_art6_3_exception_concluded: {
    q: {
      en: "Has the provider concluded and documented that the system is not high-risk although it falls into an Annex III area, because it poses no significant risk? (Article 6(3))",
      de: "Hat der Anbieter festgestellt und dokumentiert, dass das System trotz eines Anhang-III-Bereichs nicht hochriskant ist, weil es kein erhebliches Risiko birgt? (Artikel 6 Absatz 3)",
    },
  },
  annex_iii_performs_profiling: {
    q: { en: "Does the system profile natural persons? (Article 6(3))", de: "Erstellt das System Profile natürlicher Personen? (Artikel 6 Absatz 3)" },
  },
  annex_iii_point5_bc: {
    q: {
      en: "Is the use case about the creditworthiness of people, or about pricing of life or health insurance? (Annex III point 5(b) and (c))",
      de: "Geht es um die Kreditwürdigkeit von Personen oder um die Preisgestaltung bei Lebens- und Krankenversicherungen? (Anhang III Nummer 5 Buchstaben b und c)",
    },
  },
  annex_x_large_scale_it: {
    q: {
      en: "Is the system a component of a large-scale EU IT system listed in Annex X (for example for border or asylum management) that was placed on the market before 2 August 2027? (Article 111(1), Annex X)",
      de: "Ist das System Bestandteil eines in Anhang X genannten EU-Großsystems (zum Beispiel für Grenz- oder Asylverwaltung), das vor dem 2. August 2027 in Verkehr gebracht wurde? (Artikel 111 Absatz 1, Anhang X)",
    },
  },
  annex_i_section: {
    q: {
      en: "Is the AI system a safety component of a product, or itself a product, covered by the EU product legislation listed in Annex I? (Annex I)",
      de: "Ist das KI-System ein Sicherheitsbauteil eines Produkts oder selbst ein Produkt, das unter die in Anhang I genannten EU-Produktvorschriften fällt? (Anhang I)",
    },
  },
  annex_i_third_party_conformity_assessment: {
    q: {
      en: "Must the product undergo a third-party conformity assessment under that legislation? (Article 6(1), point (b))",
      de: "Muss das Produkt nach diesen Vorschriften von einer unabhängigen Stelle auf Konformität geprüft werden? (Artikel 6 Absatz 1 Buchstabe b)",
    },
  },
  gpai_model: {
    q: {
      en: "Do you provide a general-purpose AI model, that is a model that can serve many different tasks, such as a large language model? (Article 3, point 63)",
      de: "Stellen Sie ein KI-Modell mit allgemeinem Verwendungszweck bereit, also ein Modell für viele verschiedene Aufgaben, etwa ein großes Sprachmodell? (Artikel 3 Nummer 63)",
    },
  },
  gpai_systemic_risk_threshold_met: {
    q: {
      en: "Does the model have high-impact capabilities, presumed when its training compute exceeds the threshold in Article 51(2)? (Article 51(1), point (a))",
      de: "Hat das Modell Fähigkeiten mit hoher Wirkung, die vermutet werden, wenn die Rechenleistung des Trainings den Schwellenwert nach Artikel 51 Absatz 2 überschreitet? (Artikel 51 Absatz 1 Buchstabe a)",
    },
  },
  gpai_commission_designated: {
    q: { en: "Has the Commission designated the model as one with systemic risk? (Article 51(1), point (b))", de: "Hat die Kommission das Modell als Modell mit systemischem Risiko eingestuft? (Artikel 51 Absatz 1 Buchstabe b)" },
  },
  open_source_model: {
    q: {
      en: "Is the model released under a free and open-source licence, with weights, architecture and usage information made public? (Article 53(2))",
      de: "Wird das Modell unter einer freien Open-Source-Lizenz veröffentlicht, mit öffentlich zugänglichen Gewichten, Architektur und Nutzungsinformationen? (Artikel 53 Absatz 2)",
    },
  },
  art50_interacts_with_persons: {
    q: { en: "Does the system interact directly with people, for example as a chatbot? (Article 50(1))", de: "Interagiert das System direkt mit Menschen, zum Beispiel als Chatbot? (Artikel 50 Absatz 1)" },
  },
  art50_generates_synthetic_content: {
    q: { en: "Does the system generate synthetic audio, images, video or text? (Article 50(2))", de: "Erzeugt das System synthetische Audio-, Bild-, Video- oder Textinhalte? (Artikel 50 Absatz 2)" },
  },
  art50_emotion_or_biometric_categorisation: {
    q: { en: "Is the system used for emotion recognition or biometric categorisation? (Article 50(3))", de: "Dient das System der Emotionserkennung oder der biometrischen Kategorisierung? (Artikel 50 Absatz 3)" },
  },
  art50_deep_fake: {
    q: { en: "Do you use a system to generate or alter deep-fake images, audio or video? (Article 50(4))", de: "Nutzen Sie ein System, um Deepfake-Bilder, -Audio oder -Videos zu erzeugen oder zu verändern? (Artikel 50 Absatz 4)" },
  },
  art50_public_interest_text: {
    q: {
      en: "Do you publish AI-generated text to inform the public on matters of public interest? (Article 50(4), second subparagraph)",
      de: "Veröffentlichen Sie KI-generierte Texte, um die Öffentlichkeit über Angelegenheiten von öffentlichem Interesse zu informieren? (Artikel 50 Absatz 4 Unterabsatz 2)",
    },
  },
  art5_ba_bb_generation_capability: {
    q: {
      en: "Can the system generate or manipulate sexually explicit images of real people, or child sexual abuse material? (Article 5(1), points (ba) and (bb))",
      de: "Kann das System sexuell eindeutige Bilder realer Personen oder Darstellungen sexuellen Kindesmissbrauchs erzeugen oder manipulieren? (Artikel 5 Absatz 1 Buchstaben ba und bb)",
    },
  },
  processes_special_category_data_for_bias: {
    q: {
      en: "Do you intend to process special categories of personal data (such as health data or ethnic origin) to detect or correct bias? (Article 4a)",
      de: "Beabsichtigen Sie, besondere Kategorien personenbezogener Daten (etwa Gesundheitsdaten oder ethnische Herkunft) zu verarbeiten, um Verzerrungen zu erkennen oder zu beheben? (Artikel 4a)",
    },
  },
  deployer_law_enforcement_realtime_rbi: {
    q: {
      en: "Are you a law enforcement authority using real-time remote biometric identification in publicly accessible spaces? (Article 5(1), point (h))",
      de: "Sind Sie eine Strafverfolgungsbehörde, die biometrische Echtzeit-Fernidentifizierung in öffentlich zugänglichen Räumen nutzt? (Artikel 5 Absatz 1 Buchstabe h)",
    },
  },
  deployer_post_remote_biometric_law_enforcement: {
    q: {
      en: "Do you use a high-risk system for biometric identification after the event, in a criminal investigation? (Article 26(10))",
      de: "Nutzen Sie ein Hochrisiko-System zur nachträglichen biometrischen Fernidentifizierung in einem Ermittlungsverfahren? (Artikel 26 Absatz 10)",
    },
  },
  deployer_controls_input_data: {
    q: { en: "Do you control the input data that is fed into the high-risk system? (Article 26(4))", de: "Kontrollieren Sie die Eingabedaten, die in das Hochrisiko-System eingespeist werden? (Artikel 26 Absatz 4)" },
  },
  deployer_is_employer_workplace_use: {
    q: { en: "Are you an employer who uses the high-risk system at the workplace? (Article 26(7))", de: "Sind Sie Arbeitgeber und nutzen das Hochrisiko-System am Arbeitsplatz? (Artikel 26 Absatz 7)" },
  },
  deployer_public_authority_or_union_body: {
    q: {
      en: "Are you a public authority, or an EU institution, body, office or agency? (Article 26(8))",
      de: "Sind Sie eine Behörde oder ein Organ, eine Einrichtung oder sonstige Stelle der EU? (Artikel 26 Absatz 8)",
    },
  },
  deployer_public_body_or_public_service: {
    q: {
      en: "Are you a body governed by public law, or a private entity that provides public services? (Article 27(1))",
      de: "Sind Sie eine Einrichtung des öffentlichen Rechts oder ein privater Betreiber öffentlicher Dienste? (Artikel 27 Absatz 1)",
    },
  },
  deployer_processes_personal_data: {
    q: { en: "Does your use of the system involve personal data? (Article 26(9))", de: "Werden bei Ihrer Nutzung des Systems personenbezogene Daten verarbeitet? (Artikel 26 Absatz 9)" },
  },
  deployer_decisions_about_natural_persons: {
    q: { en: "Does the system make or support decisions about people? (Article 26(11))", de: "Trifft das System Entscheidungen über Menschen oder unterstützt es solche? (Artikel 26 Absatz 11)" },
  },
  rebrands_high_risk_system: {
    q: {
      en: "Do you put your own name or trademark on a high-risk system that is already on the market? (Article 25(1), point (a))",
      de: "Versehen Sie ein bereits in Verkehr befindliches Hochrisiko-System mit Ihrem Namen oder Ihrer Marke? (Artikel 25 Absatz 1 Buchstabe a)",
    },
  },
  substantially_modifies_high_risk_system: {
    q: {
      en: "Do you substantially modify a high-risk system in a way that it stays high-risk? (Article 25(1), point (b))",
      de: "Verändern Sie ein Hochrisiko-System wesentlich, sodass es hochriskant bleibt? (Artikel 25 Absatz 1 Buchstabe b)",
    },
  },
  changes_intended_purpose_to_high_risk: {
    q: {
      en: "Do you change the intended purpose of a system so that it becomes high-risk? (Article 25(1), point (c))",
      de: "Ändern Sie den Verwendungszweck eines Systems so, dass es hochriskant wird? (Artikel 25 Absatz 1 Buchstabe c)",
    },
  },
};

export const ROLE_LABELS: Record<string, { name: Pair; hint: Pair }> = {
  provider: {
    name: { en: "Provider", de: "Anbieter" },
    hint: { en: "develops an AI system or model and offers it under its own name", de: "entwickelt ein KI-System oder -Modell und bietet es unter eigenem Namen an" },
  },
  deployer: {
    name: { en: "Deployer", de: "Betreiber" },
    hint: { en: "uses an AI system in a professional setting", de: "setzt ein KI-System im beruflichen Umfeld ein" },
  },
  importer: {
    name: { en: "Importer", de: "Einführer" },
    hint: { en: "brings a system of a non-EU provider onto the EU market", de: "bringt ein System eines Anbieters aus einem Drittland auf den EU-Markt" },
  },
  distributor: {
    name: { en: "Distributor", de: "Händler" },
    hint: { en: "makes a system available on the market without being provider or importer", de: "stellt ein System auf dem Markt bereit, ohne Anbieter oder Einführer zu sein" },
  },
  authorised_representative: {
    name: { en: "Authorised representative", de: "Bevollmächtigter" },
    hint: { en: "acts in the EU on behalf of a non-EU provider", de: "handelt in der EU im Auftrag eines Anbieters aus einem Drittland" },
  },
  product_manufacturer: {
    name: { en: "Product manufacturer", de: "Produkthersteller" },
    hint: { en: "builds a product that contains an AI system, under its own name", de: "stellt ein Produkt mit einem KI-System unter eigenem Namen her" },
  },
};

export const ENUM_LABELS: Record<string, Record<string, Pair>> = {
  enterprise_size: {
    sme: { en: "Small or medium-sized enterprise, including start-ups", de: "Kleines oder mittleres Unternehmen, auch Start-ups" },
    smc: { en: "Small mid-cap company", de: "Kleines Midcap-Unternehmen" },
    other: { en: "Larger company or other organisation", de: "Größeres Unternehmen oder andere Organisation" },
  },
  annex_i_section: {
    A: { en: "Yes, Section A (for example medical devices, toys, lifts)", de: "Ja, Abschnitt A (zum Beispiel Medizinprodukte, Spielzeug, Aufzüge)" },
    B: { en: "Yes, Section B (for example vehicles, aviation, machinery)", de: "Ja, Abschnitt B (zum Beispiel Fahrzeuge, Luftfahrt, Maschinen)" },
  },
};

/** Headings of Annex III points 1 to 8 as in the corpus (English, German). */
export const ANNEX_III_AREAS: Record<string, Pair> = {
  "1": { en: "Biometrics, in so far as their use is permitted under relevant Union or national law", de: "Biometrie, soweit ihr Einsatz nach einschlägigem Unionsrecht oder nationalem Recht zugelassen ist" },
  "2": { en: "Critical infrastructure", de: "Kritische Infrastruktur" },
  "3": { en: "Education and vocational training", de: "Allgemeine und berufliche Bildung" },
  "4": { en: "Employment, workers' management and access to self-employment", de: "Beschäftigung, Personalmanagement und Zugang zur Selbstständigkeit" },
  "5": { en: "Access to and enjoyment of essential private services and essential public services and benefits", de: "Zugänglichkeit und Inanspruchnahme grundlegender privater und grundlegender öffentlicher Dienste und Leistungen" },
  "6": { en: "Law enforcement, in so far as their use is permitted under relevant Union or national law", de: "Strafverfolgung, soweit ihr Einsatz nach einschlägigem Unionsrecht oder nationalem Recht zugelassen ist" },
  "7": { en: "Migration, asylum and border control management, in so far as their use is permitted under relevant Union or national law", de: "Migration, Asyl und Grenzkontrolle, soweit ihr Einsatz nach einschlägigem Unionsrecht oder nationalem Recht zugelassen ist" },
  "8": { en: "Administration of justice and democratic processes", de: "Rechtspflege und demokratische Prozesse" },
};

export const KIND_NAMES: Record<string, Pair> = {
  obligation: { en: "Obligation", de: "Pflicht" },
  permission: { en: "Permission with conditions", de: "Erlaubnis unter Bedingungen" },
  relief: { en: "Relief", de: "Erleichterung" },
  transition: { en: "Transition rule", de: "Übergangsregel" },
  scope: { en: "Scope rule", de: "Anwendungsbereich" },
};

export const ROLE_NAME = (role: string, lang: "en" | "de"): string => ROLE_LABELS[role]?.name[lang] ?? role;
