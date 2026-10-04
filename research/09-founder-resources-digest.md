# 09 – Digest: Drei Gründer-Ressourcen

**Stand:** 2026-10-03 · **Bezug:** Drei-Personen-Test (Design-Doc §Hausaufgabe), Frist Fr 16.10. · Sinngemäß übersetzt; Bezüge zum Projekt sind Interpretation.

## Quellen und Transkriptstatus

| Nr | Quelle | URL | Transkript |
|---|---|---|---|
| 1 | "The New Way To Build A Startup" (Garry Tan laut Auftrag) | https://www.youtube.com/watch?v=rWUWfj_PqmM | Ja, Auto-Untertitel (EN), 1.283 Wörter; Video nicht angesehen |
| 2 | "How To Talk To Users" (Gustaf Alströmer) | https://www.youtube.com/watch?v=z1iF1c8w5Lg | Ja, Auto-Untertitel (EN), 3.540 Wörter, teils verhört |
| 3 | "Schlep Blindness" (Paul Graham, 2012) | https://paulgraham.com/schlep.html | Essay, Volltext (WebFetch) |

## 1. The New Way To Build A Startup

**Kernthese:** Die besten neuen Startups automatisieren nicht eine Funktion, sondern fast alle internen Abläufe ("20X-Companies"). So schlagen winzige Teams große Konkurrenten; Schlankheit ist der Hebel.

- Ein Anthropic-Entwickler wird zitiert: Claude habe Claude Cowork geschrieben, Entwickler steuern drei bis acht Claude-Instanzen parallel.
- Automatisiert wird alles: Code, Support, Marketing, Sales, Hiring, QA. Sales- und Ops-Einstellungen lassen sich lange aufschieben.
- GigaML (prägte "20X"): vier bis fünf Engineers gewannen DoorDash gegen Anbieter mit etwa hundertfacher Engineer-Zahl, dank internem Agenten "Atlas". Ein Mensch führt die Kundenbeziehung.
- Legion Health: eine interne Oberfläche für Patientenhistorie, Termine, Versicherungscodes; vierfaches Wachstum ohne Netto-Neueinstellung.
- Feathr (12 Personen): Mitarbeitende dokumentieren manuelle Aufgaben, daraus entstehen Agenten; Designer-Stelle bisher gespart.
- Einschränkung (meine Anmerkung): Alle Zahlen sind Selbstaussagen der Firmen.

**Für Altans Projekt heißt das:** Portfolio-zuerst: Dein Modell (Fable orchestriert, Sonnet/Haiku arbeiten, ADR-003) ist genau diese Geschichte und gehört sichtbar ins README und in den Screencast. Selbst GigaML lässt einen Menschen die Kundenbeziehung führen; die drei Gespräche delegierst du nicht. Das Feathr-Muster "erst dokumentieren, dann Agent bauen" passt auf den Parser: Struktur und Prüfkriterien vorab festhalten.

## 2. How To Talk To Users

**Kernthese:** Gründer sollen vor dem Produkt und danach laufend direkt mit echten Nutzern sprechen und dabei Probleme und Verhalten erforschen, nicht Lösungen abfragen. Die eigene Idee fällt erst am Ende oder gar nicht.

- Per Video, Telefon oder vor Ort, nicht per Umfrage: Fünf Minuten Video lehrten mehr als 500 oder 5.000 Umfrageantworten.
- Wen: Netzwerk ist am leichtesten, aber Bekannte antworten aus Höflichkeit weniger ehrlich. Weiter: Ex-Kollegen, LinkedIn, Slack/Discord, Events.
- Anschreiben: vorstellen, gemeinsamen Bezug nennen, Projekt knapp beschreiben, um 20 Minuten bitten.
- Zuhören, offene Nachfragen ("Erzähl mir mehr"), mitschreiben. Bildschirm zeigen lassen: Verhalten zählt mehr als Aussage.
- Sechs Fragen: Wie machst du X heute? Was ist das Schwierigste? Warum? Wie oft? Warum ist es der Firma wichtig? Was tust du heute dagegen?
- Nicht fragen: "Würdest du es nutzen?", "Welche Features?", Ja/Nein-Fragen, "Wie sähe ein besseres X aus?", zwei Fragen auf einmal.
- Nutzer haben gute Probleme, aber schlechte Lösungen (Gmail: Posteingang neben Mail = Ladezeit; Airbnb: Telefonnummern = Vertrauen) und sagen zu Features immer Ja.
- Prototyp-Test: Ziel nennen, nicht den Weg; zusehen; laut denken lassen. Excel ist ein starker Konkurrent.

**Für Altans Projekt heißt das:** Gespräche: Erst heutiges Verhalten erfragen, den Muster-Beleg danach mit Ziel statt Anleitung zeigen, nichts erklären, nie "Würdest du das nutzen?". Enge Kontakte sind weniger ehrlich: mindestens eine Person ohne Nähe, Arbeitgeber-Kontakte erst nach Freigabe (ab Mo 05.10. anfragen). Grenze: Der Talk meint 5–10 Interviews à 20 Minuten; drei à 15 testen das Verständnis eines Belegs, keinen Markt.

## 3. Schlep Blindness

**Kernthese:** Gründer übersehen gute Ideen, weil ihr Unterbewusstsein vor lästiger Arbeit (Schlep) zurückschreckt. Genau diese Schleps sind der Stoff, aus dem Geschäft besteht, und sie halten Konkurrenz fern.

- Schlep = lästige, unangenehme Aufgabe. Hacker hoffen, nur mit Code ohne Nutzergespräche und Verhandlungen auszukommen; Graham sah das nie funktionieren.
- "Ein Unternehmen definiert sich über die Schleps, die es auf sich nimmt."
- Die Blindheit ist unbewusst: Ideen mit schmerzhaften Schleps werden gar nicht erst gesehen.
- Stripe: Alle kannten das Zahlungsproblem, trotzdem baute man Rezeptseiten. Bankdeals, Betrug, Regulierung schreckten ab.
- Angst macht ambitionierte Ideen wertvoll: wie unterbewertete Aktien, weniger Wettbewerb.
- Gegenmittel: Unwissenheit; Gründer wachsen mit den Problemen.
- Bei offensichtlichen Schleps fragen: Welches Problem wünsche ich mir von jemand anderem gelöst?
- Wie ins kalte Becken springen, aber Schleps nicht um ihrer selbst willen suchen.

**Für Altans Projekt heißt das:** Das Parsen der konsolidierten Fassung (EN/DE, Provision-Tree, IDs, Hashes) ist ein Schlep im Graham'schen Sinn: unattraktiv, aber ohne ihn kein fassungsgenauer Beleg (Bericht 05, F34: vorhandene Datensätze ohne Fassungsbezug). Er ist Mittel, kein Selbstzweck; daher passt CP1 am Di 06.10. Dass du Hausaufgaben hasst, ist das Symptom aus dem Essay; die drei Gespräche sind der zweite Schlep. Die Wunschfrage gehört in die Ideensuche, nicht in die Gespräche (Hypothetik).

## Die 7 Dinge, die du wirklich wissen musst

1. Direkte Gespräche schlagen Bauen und Umfragen; nur sie zeigen, welches Problem real ist.
2. Frag nach Verhalten von heute, nie nach Meinung zu deiner Idee; "Würdest du es nutzen?" liefert wertlose Ja-Antworten.
3. Beleg erst nach den Fragen zeigen, nur ein Ziel nennen, nichts erklären, zusehen.
4. Bekannte antworten höflich statt ehrlich: mindestens eine Person ohne Nähe.
5. Schlep (Parser, Gespräche) ist das Geschäft, kein Umweg; Abneigung ist das Warnsignal.
6. Agenten-Setups machen kleine Teams stark, doch die Beispiele sind Selbstaussagen; Kundenbeziehung bleibt Menschenarbeit.
7. Drei Gespräche testen Verständnis des Muster-Belegs und validieren keinen Markt; so im Ergebnis benennen.

## Vorbereitung der drei Gespräche

**Anschreiben (Du-Form, bei Sie-Kontakten anpassen):**
Hallo [Name], ich baue als Portfolio-Projekt ein Werkzeug rund um Belege für Aussagen zum EU AI Act und suche Menschen aus Einkauf oder Recht, die im Alltag mit solchen Aussagen arbeiten. Hättest du zwischen dem 12. und 16. Oktober 15 Minuten per Video, damit ich dir ein paar Fragen zu deiner heutigen Arbeitsweise stellen und dir am Ende kurz ein Beispiel zeigen darf? Du musst dich nicht vorbereiten, ich verkaufe nichts, und es gibt keine falschen Antworten.

**Ablauf (15 Minuten; Muster-Record: "Gilt Art. 50 Abs. 1 für unseren internen Support-Chatbot und seit wann?"):**
- 0–1: Rahmen ("Ich teste das Dokument, nicht dich"); Notizen oder Aufnahme nur mit Erlaubnis.
- 1–6: Die fünf Fragen unten; Idee nicht nennen, nur "Erzähl mir mehr" und "Warum?".
- 6–7: Screenshare, Ziel nennen ("Sag mir, was du daraus entnimmst"), laut denken lassen, nicht helfen.
- 7–8: Nach 60 Sekunden Verständnis-Check (Design-Doc): Wer behauptet was? Gegen welche Fassung und welchen Stichtag? Was beweist der Record nicht?
- 8–13: Beobachten: öffnet sie den Verify-Link, wonach fragt sie? Stille aushalten, wörtliche Zitate notieren.
- 13–15: "Wer bekommt bei euch heute solche Nachweise?"; Dank; Erlaubnis für ein Update in zwei Wochen.

**Fünf Fragen (je eine auf einmal, nach Alströmer):**
1. Erzähl mir vom letzten Mal, als dir jemand etwas zum AI Act zugesichert hat, auf das du dich verlassen musstest. Wie bist du damit umgegangen? ("Letztes Mal" ist meine Ableitung; Alströmer sagt "heute".)
2. Was war daran das Schwierigste? (Nachfassen: Warum?)
3. Wie oft kommt so etwas bei dir vor?
4. Warum ist dir oder der Firma dieser Nachweis wichtig?
5. Was machst du heute, um das zu lösen? Zeig mir gern, wie das aussieht.

**Nicht tun:** Idee erklären, "Würdest du …", Features abfragen, vor dem Verständnis-Check helfen.

## LinkedIn-Post (optional, ADR-009; zum Kopieren)

Kurze Frage an alle, die im Einkauf, in der Rechtsabteilung oder in der Compliance mit Aussagen zum EU AI Act arbeiten:

Ich baue als Portfolio-Projekt ein kleines Werkzeug rund um Belege für solche Aussagen und suche drei Menschen, die mir in 15 Minuten per Video erzählen, wie sie heute mit Zusicherungen zum AI Act umgehen, wenn sie sich darauf verlassen müssen.

Keine Vorbereitung, kein Verkauf, keine Demo am Anfang. Ich stelle ein paar Fragen zu eurer heutigen Arbeitsweise und zeige am Ende kurz ein Beispiel. Zeitraum 12. bis 16. Oktober.

Wenn das auf euch zutrifft oder ihr jemanden kennt: kurze Nachricht an mich genügt. Danke.

Regeln beim Posten: keine Produktbeschreibung, kein "verifiziert", kein Link zum Repo (das Repo ist erst ab 9.10. öffentlich). Antworten mit dem Anschreiben oben beantworten und Termin vorschlagen.
