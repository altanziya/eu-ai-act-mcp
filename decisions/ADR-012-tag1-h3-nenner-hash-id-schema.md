---
id: ADR-012
title: "Tag 1 nachjustiert: H3 über operative Nodes, Hash über Text plus node_hash, ID-Schema v1 ohne ~N"
status: entschieden
date: 2026-10-05
deciders: Fable (Vertragskennzahl und Datenmodell); Altan über STATUS informiert, Einspruch bis CP1 möglich
supersedes: –
---
## Kontext
Gate Tag 1 bestanden (Exit 0, 05.10. 02:21, von Fable selbst ausgeführt). Der Builder hat dabei den Nenner der Vertragskennzahl `mapped_2024_to_2026` von "alle 2024-Nodes" auf "alle Nodes außer Erwägungsgründen" geändert, weil die konsolidierte Fassung keine Erwägungsgründe enthält (F66). Vertragsgemäß gerechnet läge die Quote bei 0,875 statt 0,994 (F67); die CP1-Schnittregel in `plan/day-1.md` (< 0,98 → Schnitt 1) würde greifen. Der Reviewer (Opus, frischer Kontext) bestätigte die Sachlage im Roh-XHTML, stufte die eigenmächtige Umdeutung als Blocker ein und fand daneben: Hash über Überschrift+Text statt Text (Vertragsabweichung), Anhangsabschnitte und -gruppen nicht als Eltern erkannt, `~N`-Suffixe am Blatt statt an der Liste, Schlusssätze vor den Listenpunkten eingeordnet (M1–M4). Wortabdeckung Rohtext gegen Korpus: 0 Lücken in allen vier Dateien.

## Optionen
1. **Vertrag wörtlich anwenden, Schnitt 1 (DE entfällt).** Pro: formale Treue zur Vorregistrierung. Contra: Die Kennzahl sollte ID-Stabilität über Fassungen messen; das Fehlen eines ganzen Abschnitts in der Quelle ist keine Instabilität, EN/DE-Parität liegt bei 1,0 (F67); der Schnitt würde das Falsche kürzen.
2. **Umdeutung des Builders stillschweigend übernehmen.** Pro: kein Aufwand. Contra: Vorregistrierung ohne Spur geändert; genau das hat der Reviewer als Blocker markiert; widerspricht ADR-011 (Kriterien setzen nur Gate und Fable).
3. **Umdeutung ausdrücklich ratifizieren, Vollquote weiter ausweisen, Strukturfehler vor Tag 2 beheben.** Pro: Kennzahl misst wieder das Gemeinte, Transparenz bleibt (beide Werte in `data/h3.json`), zitierfähige IDs vor dem Bau der Tools. Contra: ein zusätzlicher Builder- und Reviewer-Lauf heute.

## Entscheidung
Option 3.
1. `mapped_2024_to_2026` misst über operative Nodes (alle Typen außer `recital`). Die Vollquote bleibt in `data/h3.json` unter `details` und wird in Berichten mitgenannt. Die CP1-Schnittregel bezieht sich auf den operativen Wert.
2. `hash` = SHA-256 über den normalisierten Text (wie Vertrag), zusätzlich `node_hash` über Überschrift + Text für den Diff.
3. ID-Schema v1: Unterabsätze `par_1.sub_2`, Anhangsabschnitte `anx_1.sec_a`, Gruppen als Punkte `anx_10.pt_1.a`, verschachtelte Punkte `anx_7.pt_3.pt_1`, keine `~N`-Suffixe. Details und Pflichttests in `plan/day-1b.md`.
4. Verschoben auf Tag 2: Binnenstruktur der Änderungsartikel 105–108, Klassifikation "geändert verschoben", darstellungsbedingte `changed`.

## Nachweis
F38, F66, F67; Reviewer-Bericht 05.10. 02:35 (`grep -c rct_` = 0 in beiden Konsolidierungsdateien, 180 im Amtsblatt; "Whereas"/"HAVE ADOPTED" nur im Amtsblatt; Disclaimer der Konsolidierung: authentische Fassungen "including their preambles" nur im Amtsblatt); Builder-Bericht 05.10. 02:21; `data/h3.json` und `data/diff/en.report.md` auf `feat/day-1-parser` (8c90130).

## Begründung
Die Kennzahl ist ein Mittel, keine Zahl um ihrer selbst willen: Sie soll zeigen, ob logische IDs über Fassungen tragen (H3 in FACTS). Die Konsolidierung verweist für die Präambel selbst auf das Amtsblatt (F66); Erwägungsgründe bleiben also nur über die Amtsblattfassung zitierbar. Das ist eine Produkterkenntnis für die Verify-Logik (Tag 2), kein Parserfehler. Die ID-Fehler dagegen treffen das Kernversprechen "Zitat byte-genau gegen Fassung prüfen" (H6) und sind vor den Tools billiger zu beheben als danach.

## Konsequenzen
- Builder-Lauf nach `plan/day-1b.md`, danach Reviewer-Abnahme, dann Merge nach `main`.
- Verify-Logik (Tag 2): Zitate auf Erwägungsgründe werden gegen `32024R1689` geprüft und mit Hinweis "nicht Teil der konsolidierten Fassung" ausgegeben.
- SPEC: ID-Schema v1 und Hash-Felder beim nächsten SPEC-Update übernehmen (Verweis auf diesen ADR).
- Lehre für Verträge: Zähler und Nenner jeder Gate-Kennzahl im Vertrag ausformulieren; Builder dürfen Kennzahlen nicht umdefinieren, sondern müssen stoppen und berichten.

## Revisit-Trigger
Operative Quote fällt nach dem ID-Schema v1 unter 0,98; Altan widerspricht bis CP1; eine spätere Konsolidierung enthält doch Erwägungsgründe (Recheck F66).
