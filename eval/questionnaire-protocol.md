# Protokoll Fragebogen-Klassifikation (Hausaufgabe Teil 1, Prämisse 5)

Version 1.0, eingefroren am 2026-10-03 **vor** der ersten Klassifikation. Änderungen nur im Abschnitt "Änderungsprotokoll" am Ende, nie rückwirkend im Regeltext.
Bezug: `docs/designs/ai-act-verifier-benchmark.md`, §The Assignment Nr. 1 und §E1 "Wahrheitstabelle Prämisse 5".

## 1. Frage und Kriterien

Hypothese H9 ("Evidence Record als Vertriebskanal") hängt am Kriterium F: Liegt der Anteil der Fragen in realen KI-Fragebögen, die per Klassifikation plus Beleg (b) oder allein per Zitat (a) beantwortbar sind, bei mindestens 40 %? Z (Anteil in a, Schwelle 20 %) wird berichtet, entscheidet nicht. Das Personen-Kriterium P ist nicht Teil dieses Protokolls.

- F = (n_a + n_b) / N, wobei n_b die Fragen der Klasse b **ohne** a zählt (a ⊂ b wird bei der Kodierung aufgelöst, siehe 4).
- Z = n_a / N.

## 2. Einschluss und Quellenanforderung

Ein Dokument zählt als Fragebogen, wenn alle Punkte erfüllt sind:

1. **Öffentlich** ohne Login, Zahlung oder NDA abrufbar. Vertrauliches (auch arbeitgeberintern ohne schriftliche Freigabe) ist ausgeschlossen.
2. **Stabile URL**, keine Suchergebnisseite. Wurde das Dokument über einen Spiegel statt beim Herausgeber bezogen, steht das im Feld `retrieved_via`; die Herausgeber-URL wird zusätzlich genannt, falls sie existiert.
3. **Abrufdatum** (hier 2026-10-03), Herausgeber, Datum oder Version des Dokuments, SHA-256 der abgerufenen Datei.
4. **Lizenzhinweis** so, wie im Dokument oder auf der Herausgeberseite gefunden. "Keine Angabe gefunden" ist eine zulässige Angabe und wird so geschrieben. Nichts wird erraten. Das Feld `publishable_text` sagt, ob der Wortlaut der Fragen im öffentlichen Repo stehen darf: `ja` (Lizenz erlaubt Weitergabe mit Quellenangabe), `prüfen` (Lizenz unklar oder NC/ND/SA, vor Veröffentlichung Zitatrecht oder Erlaubnis klären), `nein` (nur ID und Klasse veröffentlichen).
5. Mindestens **5 extrahierbare Einzelfragen** nach Abschnitt 3. Liegt ein Dokument nur als Bild-PDF ohne Textzugriff vor, wird `curl` plus `pdftotext` versucht; scheitert das, gilt es als nicht extrahierbar und wird in `questionnaire-results.md` unter "Nicht beschafft" geführt.
6. Kriterienkataloge ohne Fragen (Aussagesätze "Der Anbieter muss ...") zählen **nicht**; es werden keine Fragen aus ihnen abgeleitet.

**Dokumenttyp** (Feld `type`, wird vor der Klassifikation vergeben):

| Typ | Bedeutung |
|---|---|
| L | Lieferanten-, Beschaffungs- oder Assurance-Fragebogen, der an einen Anbieter gerichtet ist |
| S | Selbstbewertung oder Governance-Check für eine Organisation |
| K | Klassifikator oder Entscheidungsbaum, dessen Zweck die rechtliche Einstufung ist |

Feld `ai_act_native`: `true`, wenn das Dokument nach Inkrafttreten des AI Act (2024-08-01) erschien **und** den AI Act als Maßstab nennt; sonst `false`.

## 3. Zähleinheit und Extraktion

**Zähleinheit ist die Einzelfrage**: ein vom Dokument selbst abgegrenztes Item (eigene Nummer, eigener Aufzählungspunkt, eigener Absatz mit Fragezeichen oder Aufforderung, eigenes Eingabefeld).

Gezählt wird:
- direkte Fragen ("Haben Sie ...?");
- Auskunfts- und Nachweisverlangen in Imperativform ("Beschreiben Sie ...", "Legen Sie ... vor", "Please provide ...", Dokumentenanforderungen als Aufzählungspunkt);
- Eingabefelder mit inhaltlichem Auskunftsverlangen ("Deployment model:").

Nicht gezählt wird: Überschriften, Einleitungen, Hinweise zum Ausfüllen, Glossar, Bewertungsschema, Antwortoptionen, Identifikationsfelder (Name, Anschrift, Kontakt, Produktname und -version, Datum, Ausfüllende Person), Ergebnis- und Ausgabeseiten von Tools, Vorgaben an Inhalte von Dokumenten, die der Anbieter liefern muss, wenn das Dokument sie nicht als Aufgabe an den Antwortenden formuliert (Beispiel: Anhänge C und D der Mustervertragsklauseln für KI-Beschaffung (MCC-AI) sind Inhaltsvorgaben, keine Fragen).

**Mehrfachfragen und Strukturen:**
1. Eine übergeordnete Frage und ihre **eigenständig beantwortbaren** nummerierten oder aufgezählten Unterfragen zählen **einzeln**.
2. Sind Unterpunkte nur **Antwortoptionen** (Auswahlliste) oder **Satzergänzungen** der Eltern-Frage, zählt nur ein Item: bei Optionen die Eltern-Frage, bei Satzergänzungen jede Ergänzung, versehen mit dem Stamm (der Stamm allein zählt dann nicht).
3. Mehrere Fragesätze innerhalb **eines** Items ohne eigene Gliederung bleiben **eine** Frage. Die Klasse folgt der **anspruchsvollsten** Teilfrage (Dominanz c vor b vor a): ein Item ist a nur, wenn alle Teile a sind; b nur, wenn alle Teile in a ∪ b liegen; sonst c.
4. Bedingte Folgefragen zählen einmal, unabhängig vom Antwortzweig. Tabellenzeilen mit gleichem Fragetext zählen einmal.
5. Gleichlautende Fragen an verschiedenen Stellen desselben Dokuments zählen getrennt, wenn das Dokument sie getrennt stellt.
6. Mehrsprachige Fassungen werden einmal gezählt, bevorzugt Englisch.
7. Der Wortlaut (`text`) wird wörtlich übernommen. Gekürzt wird nur, wenn er 300 Zeichen überschreitet (Kürzung mit " [...]"), wenn Fußnotenmarker oder Zeilenumbruch-Artefakte entfernt werden oder wenn eingebettete Optionslisten ausgelagert werden (`context`). Jede Abweichung steht im Feld `extraction.notes` des Fragebogens.

## 4. Klassen und Entscheidungsprozedur

Maßstab ist der **Korpus des Projekts**: die Verordnung (EU) 2024/1689 in den vom Projekt geführten Fassungen (Amtsblatt-Fassung und konsolidierte Fassung nach Omnibus). Was der AI Act selbst als Maßstab auf andere Rechtsakte verweist (zum Beispiel die Liste in Anhang I), gehört dazu.

Die Prozedur wird **in dieser Reihenfolge** angewendet; die erste zutreffende Stufe entscheidet.

**Stufe 1 (Korpus).** Hängt die Antwort von Maßstäben außerhalb des AI Act ab (DSGVO, Cyber Resilience Act, NIS2, ISO- und NIST-Normen, Ethik-Rahmenwerke, Branchenstandards, unternehmenseigene Richtlinien)? Ja: **c**. Im Rationale steht dann der Zusatz "außerhalb Korpus".

**Stufe 2 (Nachweisverlangen und Ist-Zustand).** Fragt die Frage nach dem Vorhandensein, der Ausgestaltung oder dem Beleg von Maßnahmen, Prozessen, Dokumenten, Tests, Schulungen, technischen Eigenschaften oder Zuständigkeiten der Organisation, auch wenn der AI Act solche Maßnahmen verlangt ("Haben Sie ein Qualitätsmanagementsystem nach Art. 17?", "Werden Protokolle geführt?")? Ja: **c**. Begründung: Der Beleg ist ein interner Nachweis, kein Gesetzestext und keine Einstufung.

**Stufe 3 (a).** Ist die Antwort für **jeden** Befragten gleich und folgt allein aus dem Normtext (Inhalt einer Pflicht oder eines Verbots, Frist oder Anwendbarkeitsdatum, Definition, Höhe einer Sanktion, Zuständigkeit)? Test: "Würden zwei beliebige Befragte aus dem Gesetzestext dieselbe richtige Antwort geben, ohne etwas über ihr System zu sagen?" Ja: **a**.

**Stufe 4 (b).** Verlangt die Frage, ein im AI Act definiertes **Rechtsmerkmal** (Kategorie, Rolle, Verbotstatbestand, Annex-III-Bereich, Ausnahme, Anwendungsbereich, einschlägiger Pflichtenkatalog, für das System geltende Frist) auf einen **Sachverhalt** anzuwenden? Test: "Könnte eine rechtskundige Person mit dem Gesetzestext und einer hinreichend genauen Systembeschreibung die Frage ohne weitere Nachweise (Dokumente, Testberichte, Prozessauskünfte) beantworten, und wäre der Beleg die zitierte Vorschrift?" Ja: **b**.

**Stufe 5.** Alles andere: **c** (zum Beispiel reine Sachverhaltsfragen ohne AI-Act-Merkmal, Geschäfts- und Vertragsfragen, Beschreibungen).

**Kodierung von a ⊂ b.** In den Dateien steht `a`, `b` oder `c`. `b` bedeutet "b, aber nicht a". Die Menge (b im Sinne des Design-Docs) ist daher a ∪ b.

**Sachverhaltsfragen mit AI-Act-Merkmal** (zum Beispiel "Nutzt das System biometrische Daten?"): b, weil das Merkmal ("biometrische Daten", Art. 3) ein Rechtsbegriff ist und die Antwort aus Systembeschreibung plus Norm folgt. **Reine Sachverhaltsfragen** ohne Rechtsmerkmal ("Wird Online-Lernen eingesetzt?") sind c, auch wenn die Antwort später Eingabe einer Klassifikation sein könnte.

### 4.1 Unsicherheits-Tags

Ist eine Zuordnung knapp, wählt die Rater-Person die Klasse nach den Stufen und setzt am Anfang des Rationale ein Tag:

- `[U:b]`: als c kodiert, könnte b sein;
- `[U:c]`: als b kodiert, könnte c sein;
- `[U:a]`: als b kodiert, könnte a sein;
- `[U:b2]`: als a kodiert, könnte b sein.

Die Tags dienen nur der Sensitivitätsrechnung (F_unten und F_oben in den Ergebnissen). Sie gehen **nicht** in Kappa ein.

### 4.2 Beispiele je Klasse (konstruiert, nicht aus den ausgewerteten Fragebögen)

**Klasse a (allein per Zitat aus dem Gesetzestext):**
1. "Welche Frist gilt für die Anwendbarkeit der Pflichten für Hochrisiko-Systeme nach Anhang III?" (Anwendbarkeitsdatum, Stichtag und Fassung nötig, sachverhaltsunabhängig.)
2. "Ist Emotionserkennung am Arbeitsplatz nach dem AI Act verboten?" (Art. 5 Abs. 1 Buchst. f, abstrakte Regel samt Ausnahmen.)
3. "Welche Angaben muss die technische Dokumentation eines Hochrisiko-Systems mindestens enthalten?" (Art. 11 mit Anhang IV.)

**Klasse b (Klassifikation des Systems plus Beleg):**
1. "Ist Ihr KI-System ein Hochrisiko-System im Sinne des AI Act?"
2. "Welche Pflichten treffen Sie als Anbieter für Ihr System?" (Rolle und Risikoklasse bestimmen den Katalog.)
3. "Gilt Art. 50 Abs. 1 für Ihren internen Support-Chatbot, und seit wann?" (Muster-Record des Design-Docs.)

**Klasse c (weder):**
1. "Beschreiben Sie Ihr Risikomanagement." (Nachweis, Prozessauskunft.)
2. "Legen Sie Testberichte zur Genauigkeit Ihres Modells vor." (technischer Nachweis.)
3. "Werden Ihre Mitarbeitenden regelmäßig im Datenschutz geschult?" (Organisationsfrage, außerhalb Korpus.)

### 4.3 Grenzfälle mit Entscheidung

| Frage (sinngemäß) | Klasse | Grund |
|---|---|---|
| "Erfüllen Sie die Anforderungen an Daten-Governance nach Art. 10?" | c | Stufe 2: Ist-Zustand und Nachweis, keine Einstufung |
| "Welche Fristen gelten für Ihr System?" | b | Frist hängt von der Einstufung des Systems ab |
| "Was verbietet Art. 5?" | a | sachverhaltsunabhängig |
| "Setzt Ihr System Techniken der unterschwelligen Beeinflussung im Sinne von Art. 5 Abs. 1 Buchst. a ein?" | b | Subsumtion unter Verbotstatbestand |
| "Ist Ihr System ein KI-Modell mit allgemeinem Verwendungszweck?" | b | Definition Art. 3, Systemmerkmale |
| "Ist Ihr System für Cybersicherheit zertifiziert?" | c | Stufe 1/2: Zertifikat, außerhalb Korpus |
| "Sind Sie Anbieter, Betreiber, Einführer oder Händler?" | b | Rolle nach Art. 3 |
| "Wird Ihr Modell mit personenbezogenen Daten trainiert?" | c | DSGVO-Merkmal, außerhalb Korpus |
| "Werden Nutzer informiert, dass sie mit einer KI interagieren?" | c | Maßnahme der Organisation (Stufe 2); die Frage "Gilt Art. 50 Abs. 1 für Sie?" wäre b |

## 5. Rater-Verfahren

**Rater 1** ist Claude (Sonnet 5.5) in dieser Session: klassifiziert pro Fragebogen nach den Stufen, schreibt `class_rater1` und ein Rationale (≤ 140 Zeichen) in `eval/questionnaires/<slug>.yaml`.

**Rater 2** ist dasselbe Modell in einem zweiten, **getrennten Durchgang** in derselben Session (kein Subagent, wie angewiesen):
- Arbeitsgrundlage sind ausschließlich "blinde Bögen" (ID, Wortlaut, Kontext, in zufälliger Reihenfolge, ohne Rater-1-Label), erzeugt aus der Rohextraktion, nicht aus den Rater-1-Dateien.
- Die Rater-1-Dateien werden im zweiten Durchgang weder geöffnet noch durchsucht.
- Ergebnis: `eval/questionnaires/<slug>.rater2.yaml` mit `class_rater2` und kurzem Rationale.
- Rater 2 nennt zusätzlich den **Regelpfad** (Stufe 1 bis 5, die entschieden hat) im Rationale als Präfix, damit die Entscheidung nachvollziehbar ist.

**Methodische Schwäche (ausdrücklich):** Das ist **schwächer als ein unabhängiger Bewerter**. Beide Durchgänge laufen im selben Modell und im selben Kontextfenster. Rater 2 kann sich an Rater-1-Entscheidungen erinnern, teilt dieselben Systematikfehler bei der Regelauslegung, und das Protokoll stammt vom selben Autor. Konsequenzen:
1. Kappa überschätzt die Reproduzierbarkeit. Es ist als **obere Schranke** der Übereinstimmung zu lesen, nicht als Reliabilität zwischen unabhängigen Personen.
2. Gleichgerichtete Fehler (beide Durchgänge irren gleich) bleiben unsichtbar. Das betrifft vor allem die Grenze b/c bei Sachverhaltsfragen mit Rechtsbegriff.
3. **Menschliche Nachprüfung durch Altan ist vorgesehen**: (i) alle Abweichungen zwischen Rater 1 und 2 (Liste in `questionnaire-results.md`, Soll ≤ 30 min), (ii) optional 30 zufällige Übereinstimmungen, davon mindestens 10 mit Klasse b oder a, als Stichprobe gegen gleichgerichtete Fehler.
4. Die Entscheidungen von Altan werden als dritte Spalte `class_final` in die Abweichungsliste eingetragen; die Auswertung wird danach neu gerechnet (`python3 eval/questionnaire_stats.py`).

## 6. Auswertung (vorab festgelegt)

Pro Fragebogen und gesamt: Anzahl N, Anteile a/b/c je Rater, Übereinstimmung (Anteil gleicher Klassen), **Cohen's Kappa** (ungewichtet, drei Klassen) sowie Kappa auf den beiden Binärteilungen (F: a∪b gegen c; Z: a gegen b∪c). Ist die erwartete Übereinstimmung 1 (eine Klasse beherrscht beide Raters ganz), steht "n/a (Kappa-Paradox)", und die rohe Übereinstimmung gilt.

**F und Z** werden in vier Varianten berichtet. Der Befund "F erfüllt" gilt nur als robust, wenn alle Varianten auf derselben Seite der 40-%-Schwelle liegen:
- **V1 gepoolt** über alle Fragen aller gezählten Fragebögen (wörtliche Lesart des Design-Docs, "Anteil der Fragen").
- **V2 Makro-Mittel** über Fragebögen (jeder Fragebogen gleiches Gewicht).
- **V3 gepoolt ohne Typ K** (Klassifikator-Tools stellen konstruktionsbedingt Einstufungsfragen).
- **V4 gepoolt ohne den größten Fragebogen**.

Je Variante: F nach Rater 1, nach Rater 2, "konservativ" (beide a∪b), "liberal" (mindestens einer a∪b) und die Tag-Spanne F_unten/F_oben (Rater 1). Konfidenzintervalle: Wilson 95 % auf den Fragen. Sie unterstellen unabhängige Fragen und sind **zu eng**, weil Fragen innerhalb eines Dokuments gruppiert sind; deshalb ist V2 die vorsichtigere Lesart.

**Auswahlverzerrung:** Die Fragebögen sind eine Gelegenheitsstichprobe nach öffentlicher Verfügbarkeit. Vor dem AI Act entstandene Dokumente können AI-Act-Fragen nicht stellen (F strukturell niedrig). Klassifikator-Tools fragen strukturell nach Einstufung (F strukturell hoch). Echte, nach dem AI Act erstellte Lieferantenfragebögen großer Einkäufer sind öffentlich selten. Das wird in den Ergebnissen mitgeführt, nicht weggerechnet.

## 7. Datei- und Feldschema

`eval/questionnaires/<slug>.yaml`:

```yaml
slug: ...
title: ...
publisher: ...
audience: ...            # Zielgruppe
type: L|S|K
ai_act_native: true|false
source:
  url: ...               # Herausgeber- oder Primär-URL
  landing_page: ...      # Herausgeberseite oder Repo
  retrieved_via: ...     # falls Spiegel oder abgeleiteter Datensatz
  retrieved_at: 2026-10-03
  document_date: ...
  license_note: ...      # wörtlich gefunden oder "keine Angabe gefunden"
  sha256: ...
  publishable_text: ja|prüfen|nein
  authority: ...         # beschreibende Einschätzung der Quelle, ohne Einfluss auf Klassen
extraction:
  method: ...
  n_questions: N
  exclusions: ...
  notes: ...
questions:
  - id: ...
    text: ...            # wörtlich, > 300 Zeichen gekürzt
    section: ...         # optional, Abschnitt im Dokument
    context: ...         # optional, Antwortoptionen
    class_rater1: a|b|c
    rationale: "[U:b] ..."
```

`eval/questionnaires/<slug>.rater2.yaml`: `slug`, `rater: 2`, `protocol_version`, Fragenliste mit `id`, `class_rater2`, `rationale` (Präfix Regelpfad). Der Wortlaut steht nur in der Rater-1-Datei; das Auswertungsskript verbindet über `id`.

## 8. Lizenz- und Veröffentlichungshinweis

Fragetexte bleiben Eigentum der Herausgeber. Die CC-BY-4.0-Regel des Projekts gilt nur für Klassen, IDs und Rationale (eigene Zutaten). Vor Veröffentlichung des Verzeichnisses `eval/questionnaires/` gilt je Datei das Feld `publishable_text`; bei `prüfen` und `nein` sind Wortlaute zu entfernen oder durch ID plus Hash zu ersetzen. Es werden keine Quelldateien im Repo abgelegt, nur URL, Abrufdatum und Hash.

## 9. Änderungsprotokoll

| Datum | Änderung |
|---|---|
| 2026-10-03 | Version 1.0 eingefroren vor der Klassifikation. |
| 2026-10-03 (nach der Klassifikation, nur additiv) | Schemafelder `source.landing_page`, `source.authority`, `questions[].section` und der Dateikopf `rater1` ergänzt (rein beschreibend, ohne Einfluss auf Klassen). Hilfsdateien `eval/questionnaire_stats.py` und `eval/questionnaires/_adjudication.csv` ergänzt. Regeltext der Abschnitte 2 bis 6 unverändert. |
| 2026-10-03 (Transparenz zu Rater 2) | Vor dem zweiten Durchgang waren die Rater-1-Klassenverteilungen je Fragebogen als Zählausgabe der Dateierstellung sichtbar; einzelne Rater-1-Labels wurden im zweiten Durchgang nicht angesehen. Rater 2 hat alle 701 Fragen einzeln gelesen, die 320 Fragen von AI-CAIQ zuvor einmal in sortierter Reihenfolge und danach nicht erneut in der gemischten Reihenfolge. |
