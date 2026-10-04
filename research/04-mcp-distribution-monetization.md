# Research 04: MCP-Distribution, Monetarisierung, Protokollstand und Obsoleszenz-Schutz

**Stand:** 2026-10-03 · **Bezug:** SPEC.md §0-4, §7 · **Kennzeichnung:** **[P]** Primärquelle (Herstellerdoku, GitHub-API, npm-API, heute abgerufen), **[S]** Sekundärquelle (Blog/Presse, teils SEO-lastig), **[E]** eigene Schlussfolgerung. Zahlen in eckigen Klammern verweisen auf die Quellenliste.

## Executive Summary

1. **Drei Listungswege mit offiziellem Prozess:** Official MCP Registry (nur Metadaten, Namespace-Verifikation), Anthropic Connectors Directory (Self-Serve-Portal, Remote-HTTPS, Standardlistung als "Community") und ChatGPT-App-Verzeichnis (Streamable HTTP, Domain-Challenge, Review mit Testfällen) [4][6][9].
2. **Anthropic nimmt keine lokalen Server (MCPB) mehr an.** Lokales npm-Paket nur noch über ein Plugin-Bundle; Skills nur im Plugin [6][8]. Remote-Endpoint ist damit der Hauptkanal, npm der Entwicklerkanal.
3. **Reale Nutzung konzentriert sich auf Infrastruktur für Coding-Agenten:** Playwright MCP 29,0 Mio. npm-Downloads/Monat, Context7 3,0 Mio., Firecrawl 0,40 Mio., Exa 0,24 Mio. [P, 13]. Für Nischen-Datenserver fand ich keine Basisraten.
4. **Kein Verzeichnis veröffentlicht Referral-Zahlen.** Messbar ist nur das, was man selbst loggt, plus Anthropics Listing-Dashboard (Health, Nutzung je Tool) [8].
5. **Verdient wird mit nutzungsbasierten Tools mit echten Grenzkosten** (Suche/Crawling, ca. $1-15 je 1.000 Calls, ca. 1.000 Gratis-Credits/Monat) [16-22]. Ein bezahlter reiner Wissens-MCP mit belegtem Umsatz: nicht gefunden.
6. **Agentic Payments sind für uns nicht entscheidend:** x402 meldet >200 Mio. Transaktionen, laut Artemis/CoinDesk aber >95 % Signaling und ca. $28k echtes Tagesvolumen [S, 25]. Visa/Mastercard/ACP zielen auf Shopping, nicht auf API-Metering [S, 26].
7. **Spec 2026-07-28 ist final und stateless:** kein `initialize`, kein `Mcp-Session-Id`, Tasks als Extension, Roots/Sampling/Logging deprecated [P, 1]. TS-SDK v2.3.0 erschien gestern [P, 3]. Wir müssen von Tag 1 zustandslos bauen.
8. **Obsoleszenz-Risiko ist real für "Gesetzestext liefern", gering für Fassungsstand, Diff, Soft-Law-Seitenreferenzen, Regel-Engine, Change-Feed** [E, 32].
9. **Größtes Tool-Design-Risiko: das Modell ruft das Tool gar nicht auf**, weil es den AI Act zu kennen glaubt. Anthropics Doku sagt ausdrücklich, dass Claude bei Wissensfragen zu einem verbundenen Dienst nicht zwingend das Tool nutzt [P, 28].
10. **Stack in 1-2 Wochen:** Workers + Hono + TS-SDK v2, Supabase Pro, Stripe-Subscriptions, OAuth via WorkOS AuthKit/Clerk, Zähler in Postgres. Ca. 30-40 €/Monat im Betrieb. Apache-2.0 + CC-BY bleibt marktüblich [P, 14].

## 1. Distribution

| Kanal | Anforderungen | Reichweite / Messbarkeit | Evidenz |
|---|---|---|---|
| Official MCP Registry (v1.8.1) | `server.json`: Pflicht `name`, `description`, `version`; Namespace per GitHub (`io.github.*`) oder DNS/HTTP (`com.*`); Pakete nur von npm/PyPI/NuGet/Cargo/OCI/MCPB; `remotes` mit `streamable-http` möglich | Metadaten-Katalog, keine Nutzerzahlen | P [4, 5] |
| Anthropic Connectors Directory | Portal `claude.ai/directory/manage`, bezahlter Plan; Remote-HTTPS; OAuth 2.0 **oder keine Auth bei öffentlichen Daten**; je Tool `title` + `readOnlyHint`/`destructiveHint`; Datenschutzerklärung, Testkonto, 7 Compliance-Bestätigungen (u. a. Finanztransaktionen). Auto-Scan, Standardlabel "Community"; Verified-Prüfung wird bei hoher Nützlichkeit automatisch eskaliert | Dashboard mit Health und Nutzung je Tool; Plugin-Tab mit Installs | P [6][7][8] |
| ChatGPT Apps/Plugin-Verzeichnis | `streamable-http` über HTTPS, OAuth oder noauth; Domain-Challenge `/.well-known/openai-apps-challenge`; Identitätsverifikation; 5 positive + 3 negative Testfälle, Video, Reviewer-Konto ohne MFA; Tool-Scan; Länder-Targeting | Review ca. 3-7 Werktage [S, 10] | P [9] |
| VS Code | `@mcp`-Suche in der Extensions-Ansicht, Tools/Resources/Prompts/MCP Apps, Org-Policies | keine Zahlen | P [15] |
| PulseMCP / Glama / mcp.so / Smithery | Listung meist per Claim/Einreichung; PulseMCP: 21.750 Server, **Neueinreichungen aktuell pausiert**; Glama ca. 37k, mcp.so ca. 20k, Smithery ca. 7k | PulseMCP zeigt "Est. Visitors/Woche": Playwright 5,5 Mio., Context7 459k. Glama behauptet 1 Mio.+ Calls/Monat (Eigenangabe) | P [11], S [12] |
| Cursor, Composio, skills.sh | **nicht recherchiert** (Suchbudget erschöpft) | - | offen |

**Nutzungszahlen (npm, 02.09.-01.10.2026) [P, 13]:** Playwright MCP 29,0 Mio.; Context7 3,04 Mio.; Filesystem 2,75 Mio.; Notion 0,72 Mio.; Firecrawl 0,40 Mio.; Exa 0,24 Mio.; Tavily 0,09 Mio. npm-Zahlen enthalten CI und Caches, keine eindeutigen Nutzer. Die Gewinner haben große Marken (Microsoft, Google, Upstash mit 62k Sternen) und lösen ein Problem jedes Coding-Agenten. Unsere Pakete `eu-ai-act-mcp` und `aiact-mcp` sind auf npm frei (404) [P].

**Anthropic-Sonderpunkte:** Der Messages-API-MCP-Connector (Beta `mcp-client-2025-11-20`) braucht öffentlichen HTTP-Server (Streamable HTTP oder SSE), kein stdio, nicht auf Bedrock/Vertex, nicht ZDR-fähig [P, 28]. Managed Agents hängen MCP per URL an und authentifizieren über Vault (`static_bearer` oder `mcp_oauth`); Tool-Output >100.000 Zeichen wird in eine Datei ausgelagert [P, 30]. Ein Bearer-API-Key reicht also für Agent-Builder; Endnutzer in Claude.ai brauchen vermutlich OAuth [E, ungeprüft].

## 2. Monetarisierung

| Produkt | Modell | Free | Preise |
|---|---|---|---|
| Exa | nutzungsbasiert | $10 Credits/Monat | $4/1k Instant, $7/1k Auto, $12-15/1k Deep, Contents $1/1k, Answer $5/1k [P, 16] |
| Tavily | Credits | 1.000/Monat | PAYG $0,008/Credit; Pläne $30 (4k) bis $500 (100k) [P, 17] |
| Firecrawl (AGPL-3.0) | Credits-Abo | 1.000 Credits | $16 (5k), $83 (100k), $333 (500k), $599 (1 Mio.) [P, 18] |
| Context7 (MIT-Client) | Seat + Calls | 1.000 Calls/Monat | Pro $10/Seat mit 2.000 Calls, Overage $5/1k [P, 19] |
| Composio | Tool-Calls | 100k/Monat | Pro $29, Overage $0,30/1k [P, 20] |
| Zapier MCP | Tasks | 100 Tasks | 1 MCP-Call = 2 Tasks; ab $19,99 für 750 Tasks [P, 21] |
| Perplexity Sonar | Request + Token | k. A. | $5-14/1k Requests plus Tokens; Search API $5/1k [P, 22] |
| Apify | Pay-per-Event, Creator setzt Preis | - | Marktplatz-Anteil laut [S] 80/20; "$500k+ Auszahlungen/Monat" (Eigenangabe) [P, 23] |

**Muster:** Alle verdienen an Tools mit variablen Kosten (Crawling, Suche, Compute). Das Gratiskontingent liegt bei ca. 1.000 Calls/Monat; unser Entwurf (500) liegt darunter [E]. Context7 zeigt, dass Free-Tiers gekürzt werden, sobald Kosten drücken [S, 42]. **Konversionsraten: nirgends öffentlich gefunden.** Umsatzbehauptungen wie "21st.dev $10k MRR in 6 Wochen" oder "unter 5 % der Server monetarisiert" stammen aus SEO-Blogs [S, 24] und sind nicht belastbar. Kuratierte Marktplätze (MCPize, MCP Marketplace: 85/15) sind [S] und nicht verifiziert.

**Agentic Payments:** x402 (Coinbase, seit Stripe-Anbindung Feb 2026 auch per PaymentIntents) zählt >200 Mio. Transaktionen, aber Artemis findet >95 % Protokoll-Signaling, CoinDesk ca. $28k/Tag echtes Volumen (März 2026); ein unabhängiger Schätzer nennt ca. $14k/Tag [S, 25]. Visa TAP, Mastercard Agent Pay, Stripe ACP laufen real, aber für Händler-Checkout [S, 26]. **Urteil [E]:** Pay-per-Call lohnt 2026 nicht als Hauptmodell. Optionales Experiment erst nach Pro-Launch (Zielgruppe "Agent ohne Konto").

## 3. Protokollstand und Obsoleszenz

| Thema | Stand 2026-10 |
|---|---|
| Spec | 2026-07-28 final (RC 21.05.) [P, 1] |
| Transport | Streamable HTTP; Pflichtheader `Mcp-Method`/`Mcp-Name`; Legacy-HTTP+SSE deprecated, 12 Monate Frist [P/S, 1][2] |
| Zustand | `initialize`-Handshake und `Mcp-Session-Id` **entfernt**; Zustand nur über explizite Handles in Tool-Argumenten; Metadaten pro Request in `_meta`; `server/discover` [P/S, 1][2] |
| Auth | OAuth 2.1 Resource Server; OIDC-Angleichung; DCR deprecated zugunsten Client-ID-Metadata-Documents [S, 2] |
| Elicitation | durch Multi-Round-Trip-Requests (`input_required`) ersetzt [P/S, 1][2] |
| Tasks | als Extension neu (`tasks/get`, `update`, `cancel`) [P, 1] |
| Structured Output, Resources, Prompts | bleiben; JSON Schema 2020-12 [S, 2] |
| Deprecated | Roots, Sampling, Logging (nur Annotation) [P, 1] |
| Extensions | MCP Apps (UI im Chat; Claude, VS Code, ChatGPT) [P/S, 1][34] |
| Lifecycle | Active → Deprecated → Removed, mind. 12 Monate [P, 1] |
| SDK | TS v2.3.0 (02.10.2026): ein Server je Request, `@modelcontextprotocol/hono`; v1.32.0 parallel [P, 3] |
| Registry-Format | `server.json`, Schema 2025-12-11 [P, 5] |

**Konkurrenz:** OpenAI Apps SDK baut auf MCP auf und konvergiert über MCP Apps [34]; es ist Distributionskanal, kein Ersatz. Agent Skills sind offener Standard (Dez 2025), von OpenAI übernommen [S, 33]; Anthropic listet Skills nur im Plugin [8]. Skills ergänzen MCP ("Wissen wie") statt es zu ersetzen [S]. **A2A und direktes OpenAPI: nicht recherchiert.** Tool Search lädt Tools nach Bedarf (>85 % weniger Definitions-Token) und sucht in Namen, Beschreibungen und Argumentnamen [P, 29].

**Werden Modelle Gesetze selbst korrekt zitieren?**

| Dafür (Layer überflüssig) | Dagegen |
|---|---|
| Alle aktiven Claude-Modelle unterstützen Citations auf Dokumenten und `search_result`-Blöcken [P, 27]; Web Search/Fetch serverseitig verfügbar [P, Skill] | Studie 2026 (ukrainisches Recht, 100 Fragen): 13-21 % halluzinierte Zitate; Web-Zugriff senkt nur auf 3-13 % falsche URLs [S, 32] |
| EUR-Lex ist frei abrufbar; generische `eur-lex-mcp-server` existieren [SPEC] | **Fassungsproblem [E]:** Der Wissensstand dieses Berichts-Modells endet Juni 2026, vor VO 2026/1744 (27.07.2026). Ohne `as_of`-Layer zitieren Modelle ggf. die alte Fassung |
| Kommission baut Checker/Explorer [SPEC] | Citations sind mit Structured Outputs inkompatibel (400) [P, 27]; ein Korpus mit exakten Spans ist die Grundlage für belegbares Zitieren |

**Bewertung [E]:** Reines `get_provision` wird Commodity. Haltbar sind Versionierung (`as_of`, Diff), Soft-Law mit Seitenreferenz, nationales Recht, deterministische Regel-Engine mit öffentlicher Testsuite, Change-Feed. Offen: ob die Kommission eine API/MCP für den Service Desk ankündigt (Suchbudget erschöpft, nicht geprüft).

## 4. Tool-Design für Agenten

Aus Anthropic "Writing tools for agents" [P, 31] und Tool-Search-Doku [P, 29]:

- **Wenige, workflow-orientierte Tools** statt API-Wrapper; zusammenführen (`schedule_event` statt drei Tools). Selektionsgenauigkeit sinkt ab ca. 30-50 Tools; Tool Search lohnt ab ca. 10 Tools.
- **Namespacing** (`aiact_search`, `aiact_get_provision`); Präfix vs. Suffix messbar unterschiedlich, testen.
- **Antwortgröße steuerbar:** `response_format: concise|detailed`, Paginierung, Kürzungshinweis auf sparsamere Strategie. Claude Code kappt bei 25.000 Token; Managed Agents lagern >100k Zeichen aus [P, 30].
- **Fehler handlungsleitend:** gültige `as_of`-Bereiche, Beispielaufruf, nächste Schritte statt Codes.
- **Beschreibungen wie Onboarding eines Kollegen;** kleine Textänderungen bringen große Evals-Sprünge. Eval-Set mit Held-out-Fragen und Metriken (Genauigkeit, Tool-Calls, Token, Fehler).
- **Annotationen Pflicht:** alle unsere Tools `readOnlyHint: true`.

**Was ignorierte von genutzten MCPs trennt [E, abgeleitet]:** Das Modell nutzt ein Tool, wenn es *nicht glaubt, die Antwort zu kennen*. Claude beantwortet "Wie funktionieren Notion-Datenbanken?" trotz verbundenem Notion-Server direkt [P, 28]. Für den AI Act heißt das: Beschreibung explizit ("Immer aufrufen für Wortlaut, Fristen, Fassungen; Trainingsdaten kennen VO 2026/1744 nicht") plus Plugin mit Skill, das den Aufruf vorschreibt [8].

## 5. Open-Core für Kleinstteams

| Projekt | Lizenz (GitHub, heute) [P, 14] | Muster |
|---|---|---|
| Supabase (111k ★) | Apache-2.0 | permissiv, Geld mit Hosting |
| PostHog (40k ★) | MIT, `ee/`-Ordner separat | Open Core mit Enterprise-Ordner |
| Umami / Plausible | MIT / AGPL-3.0 | Hosting + Self-Host kostenlos |
| Firecrawl (188k ★) | AGPL-3.0 | Cloud als Produkt, AGPL gegen Hoster |
| Context7 (63k ★) | MIT (Repo); Backend laut [S] proprietär | offener Client, geschlossener Dienst |
| Sentry | FSL-1.1-Apache-2.0 (2 Jahre) | Fair Source [36] |
| Cal.com | AGPL bis 04/2026, dann Wechsel auf proprietär; Community-Fork Cal.diy MIT | Lizenzwechsel mit Gegenwind [S, 35] |
| Lago / Unkey / OpenMeter | AGPL-3.0 / AGPL-3.0 + `packages/` anders / Apache-2.0 | Billing-Bausteine |

**Einordnung [E]:** Klonschutz entsteht bei uns nicht durch Lizenz, sondern durch Pipeline, Review-Gate, Aktualität und Marke. Der Korpus ist per Design CC-BY. AGPL würde GRC-Hersteller (Vendor-Tier) abschrecken, deren Rechtsabteilungen AGPL meiden; BSL/FSL sind auch bei Sentry-Größe umstritten, und das MCP-Projekt selbst wechselt von MIT auf Apache-2.0 [P, 14]. Empfehlung bleibt **Apache-2.0 (Code) + CC-BY-4.0 (Korpus) + Markenschutz für den Namen**. Cal.com warnt vor späterem Lizenzwechsel: Entscheidung vor dem ersten Release treffen.

## 6. Betrieb und Kosten

| Baustein | Preis | Quelle |
|---|---|---|
| Cloudflare Workers Paid | min. $5/Monat, 10 Mio. Requests + 30 Mio. CPU-ms inkl.; Overage $0,30/Mio. Requests; Hyperdrive inkl. | P [37] |
| Supabase | Free: 500 MB, **Pause nach 1 Woche Inaktivität**; Pro ab $25 (8 GB, 250 GB Egress); pgvector inklusive; Small-Compute $15 | P [38] |
| Fly.io (Postgres selbst betrieben) | ca. $8-14 | S [39] |
| Railway | ca. $42 | S [39] |
| Hetzner CX/CAX | ca. €4-6, Preise 2026 zweimal erhöht, eigener Postgres-Betrieb | S [39], Hetzner-Seite ohne Preise |

**Realistisch [E]:** Launch ca. $5-30/Monat (Workers $5; Supabase Free nur Dev, Prod Pro $25), plus Domain, Stripe-Gebühren (ca. 1,5 % + 0,25 € EU-Karten, nicht geprüft). Das reicht weit über die Kill-Kriterien hinaus; 10 Mio. Requests sind inklusive. Embedding-Kosten bei dieser Korpusgröße (geschätzt <1 GB) vernachlässigbar, nicht gemessen.

**Bausteine:**
- **Auth/OAuth für MCP:** WorkOS AuthKit (gratis bis 1 Mio. MAU; MCP-Auth-Doku seit 21.05.2026) [S, 40]; Clerk (50k MAU frei, Pro $25) [S]; Stytch (10k MAU frei) [S]. Anthropic erlaubt bei öffentlichen Daten den Betrieb **ohne Auth** [P, 6]; das ist der Einstieg für Free.
- **Metering/Billing:** Stripe Meters (Basis-Usage inklusive, ab 100 Mio. Events an Metronome verwiesen; Stripe übernahm Metronome 01/2026) [S, 41]; Lago (AGPL, selbst hostbar), OpenMeter (Apache-2.0) [P, 14]. Für Flat-Tiers unnötig.
- **API-Keys und Rate-Limits:** Unkey (AGPL) oder Workers-Rate-Limiting-Binding [E, ungeprüft].

## Implikationen für unser Produkt

**Distribution-Plan (nach Aufwand/Evidenz):**
1. Woche 1-2: npm-Paket + Remote-Endpoint **ohne Auth** (Free) → Official Registry (`io.github.<user>/…` oder eigene Domain mit DNS-Proof).
2. Direkt danach Anthropic-Connector einreichen (Datenschutz, Testkonto, Annotationen vorab). Parallel Plugin-Bundle mit Skill, das den Tool-Aufruf erzwingt; das liefert Usage-Dashboard.
3. ChatGPT-Verzeichnis (Business-Verifikation, Domain-Challenge, 5+3 Testfälle) sobald Kanal 1+2 stabil.
4. Messung selbst bauen: pro Kanal eigene URL/Pfad oder Client-Identität aus `_meta` [S, 2], damit die Kill-Kriterien (100 Calls/Woche) pro Kanal auswertbar sind.
5. PulseMCP/Glama beanspruchen, wo möglich; Erwartung niedrig [E].

**Preismodell [E]:** Free anonym (Orientierung am Markt: ca. 1.000-2.000 Calls/Monat, Grenzkosten ~0). **Pro nicht über Call-Menge, sondern über Wert verkaufen:** Change-Feed/Webhooks, Diff-Historie, SLA-Fassungsstand; Calls nur als Fair-Use-Cap (die SPEC-Spanne 29-79 € ist plausibel, aber ungetestet). Vendor-Tier und Report wie in SPEC §7. x402/Pay-per-Call erst als Experiment nach Pro.

**Stack-Empfehlung:** TS-SDK v2 + Hono auf Cloudflare Workers (stateless, Server pro Request) · Supabase Pro über Hyperdrive · OAuth via WorkOS AuthKit oder Clerk für Pro, Bearer-Key für Agent-Builder und Managed Agents · Stripe Checkout + Subscriptions · Nutzungszähler als Postgres-Tabelle · Resend für Alerts. Billing-Vendor frühestens ab Vendor-Tier.

**Konkrete SPEC-Änderungen:**
- `extract_facts` aus dem Server streichen; das aufrufende Modell füllt das Schema von `classify_system` selbst (spart LLM-Kosten und Abhängigkeit) [E].
- Tools auf 8-10 straffen (`get_provision` + `cite` + `glossary` zusammenlegen), Präfix `aiact_`.
- Free-Tier von 500 auf mindestens 1.000 Calls.

**Obsoleszenz-Schutz (nächste 1-2 Monate):**
- Von Tag 1 Spec 2026-07-28 (stateless, `Mcp-Method`-Header) **und** Rückwärtskompatibilität zu 2025-11-25 testen; Clients (Claude.ai, ChatGPT, VS Code, Claude Code) sind nicht alle gleich schnell migriert [E].
- Kein Sampling, Roots, Logging, keine Sessions, keine Elicitation. Offene Fragen als `uncertain` + `open_questions` im Ergebnis zurückgeben.
- Tools sind der Kern; Resources/Prompts nur Zusatz, denn dokumentiert ist für den Anthropic-Connector Tool-Zugriff [P, 28].
- REST/OpenAPI aus demselben Handler ist Rückversicherung gegen Protokollwechsel.
- Differenzierung ausbauen: `as_of`, Diff, Soft-Law, DE-Recht, Evals je Release, DOI.
- Watchlist: nächste Spec-Revision, Kommissions-API, MCP-Registry-Änderungen, Verzeichnis-Policies (Finanztransaktionen).

## Evidenzqualität und offene Fragen

- **Suchbudget (200 WebSearch/Session) war erschöpft;** nicht geprüft: Cursor-Marketplace, Smithery-/Glama-Details, skills.sh, Browserbase-Preise, A2A, EU Publications Office (MCP/API), Stripe-/Cloudflare-Gebühren.
- **Starke Evidenz [P]:** Anthropic-/OpenAI-/MCP-Dokumentation, GitHub-Lizenzen und Sterne, npm-Downloads, Preisseiten (Exa, Firecrawl, Tavily, Composio, Zapier, Perplexity, Supabase, Context7).
- **Schwach [S]:** Verzeichnisgrößen, Revenue-Anekdoten, x402-Zahlen (widersprüchlich: Zähler 75 Mio. vs. 205 Mio.), Hosting-Preise (Hetzner-Seite ohne Zahlen), OpenAI-Reviewdauer, Auth-Preise, Details der 2026-07-28-Spec jenseits des Release-Blogs. Widerspruch: Eine Quelle nennt für Context7 Pro 5.000 Calls, die Preisseite 2.000; ich nutze die Preisseite.
- **Unbekannt:** Konversionsraten, Basisraten für Nischen-Datenserver, ob Claude.ai-Custom-Connectors Bearer-Keys durchreichen, ob der MCP-Connector `search_result`-Citations aus Tool-Ergebnissen abbildet, Kommissionspläne für eine API.
- **Nächste Validierung:** 2-Stunden-Spike: Remote-Stub (Workers + SDK v2) in Claude.ai, ChatGPT-Dev-Mode, VS Code und Claude Code verbinden und Protokollversionen sowie Auth-Verhalten dokumentieren.

## Quellen

[1] https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/
[2] https://zylos.ai/research/2026-07-29-mcp-2026-spec-overhaul-stateless-oauth-tasks-apps/ (S)
[3] https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2.3.0
[4] https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md
[5] https://registry.modelcontextprotocol.io/v0/servers (API-Abruf)
[6] https://claude.com/docs/connectors/building/submission
[7] https://claude.com/docs/connectors/verification
[8] https://claude.com/docs/directory/publish
[9] https://developers.openai.com/apps-sdk/deploy/submission
[10] https://sunpeak.ai/blogs/submit-chatgpt-app-as-plugin/ (S)
[11] https://www.pulsemcp.com/servers
[12] https://thinkneo.ai/blog/mcp-registries-compared-20260714 ; https://unyly.org/blog/best-mcp-directories-2026 (S)
[13] https://api.npmjs.org/downloads/point/last-month/<paket> (eigene Abfrage 2026-10-03)
[14] https://api.github.com/repos/<owner>/<repo> und /license (eigene Abfrage 2026-10-03)
[15] https://code.visualstudio.com/docs/copilot/customization/mcp-servers
[16] https://exa.ai/pricing
[17] https://docs.tavily.com/documentation/api-credits
[18] https://www.firecrawl.dev/pricing
[19] https://context7.com/docs/plans-pricing
[20] https://composio.dev/pricing
[21] https://zapier.com/pricing
[22] https://docs.perplexity.ai/guides/pricing
[23] https://apify.com/mcp/developers
[24] https://mcp-marketplace.io/blog/state-of-mcp-monetization-2026 ; https://mcpize.com/blog/make-money-with-mcp (S)
[25] https://finance.yahoo.com/markets/crypto/articles/x402-foundation-activated-27-old-152440828.html ; https://www.danielmcglynn.com/the-x402-counter-has-shown-the-same-four-numbers-since-march/ ; https://bex.co/blog/2026/04/01/x402-protocol-http-402-ai-agent-commerce-stablecoin-payments (S)
[26] https://nevermined.ai/blog/best-platforms-agentic-payments ; https://eco.com/support/en/articles/14839400-what-is-agentic-commerce-the-2026-guide (S)
[27] https://platform.claude.com/docs/en/build-with-claude/citations
[28] https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
[29] https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
[30] https://platform.claude.com/docs/en/managed-agents/mcp-connector
[31] https://www.anthropic.com/engineering/writing-tools-for-agents
[32] https://arxiv.org/abs/2606.00898 ; https://arxiv.org/pdf/2604.03173 (S/Preprints)
[33] https://thenewstack.io/agent-skills-anthropics-next-bid-to-define-ai-standards/ ; https://www.pulsemcp.com/posts/openai-agent-skills-anthropic-donates-mcp-gpt-5-2-image-1-5 (S)
[34] https://www.theregister.com/special-features/2026/01/26/claude-supports-mcp-apps-presents-ui-within-chat-window/ (S)
[35] https://cal.com/blog/cal-diy-open-source-to-closed-source ; https://itsfoss.com/news/cal-com-goes-proprietary/
[36] https://techcrunch.com/2024/09/22/some-startups-are-going-fair-source-to-avoid-the-pitfalls-of-open-source-licensing/
[37] https://developers.cloudflare.com/workers/platform/pricing/ (über Suchtreffer)
[38] https://supabase.com/pricing
[39] https://blog.railway.com/p/best-postgresql-hosting-2026 ; https://bex.co/blog/2026/08/16/hetzner-double-price-hike-cheap-box-assumption-cost-model ; https://getdeploying.com/flyio-vs-supabase (S)
[40] https://www.scalekit.com/blog/workos-alternatives ; https://aibizhub.io/articles/workos-vs-clerk-vs-stytch-2026/ (S)
[41] https://www.landbase.com/blog/usage-based-billing-software ; https://aliteq.com/usage-based-billing-ai-app (S)
[42] https://blog.devgenius.io/context7-quietly-slashed-its-free-tier-by-92-16fa05ddce03 (S)
