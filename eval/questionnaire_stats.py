#!/usr/bin/env python3
"""Auswertung der Fragebogen-Klassifikation (eval/questionnaire-protocol.md, Abschnitt 6).

Liest eval/questionnaires/<slug>.yaml (Rater 1) und <slug>.rater2.yaml (Rater 2), optional
eval/questionnaires/_adjudication.csv (Spalten id,class_final,note; von Altan auszufüllen).
Nur Standardbibliothek. Der YAML-Leser versteht nur das vom Protokoll festgelegte Format
(JSON-gequotete Strings, einfache Skalare, Liste unter `questions:`).

Aufruf:  python3 eval/questionnaire_stats.py            -> Markdown-Tabellen auf stdout
         python3 eval/questionnaire_stats.py --check    -> nur Konsistenzprüfung
"""
import csv, glob, json, math, os, random, re, sys
from collections import Counter

ROOT = os.path.dirname(os.path.abspath(__file__))
QDIR = os.path.join(ROOT, "questionnaires")


# ---------------------------------------------------------------- minimaler YAML-Leser
def _val(v):
    v = v.strip()
    if v.startswith('"'):
        return json.loads(v)
    if v in ("true", "false"):
        return v == "true"
    if re.fullmatch(r"-?\d+", v):
        return int(v)
    return v


def read_yaml(path):
    top, cur_map, items, item = {}, None, None, None
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.rstrip("\n")
            if not line.strip():
                continue
            if not line.startswith(" "):
                key, _, rest = line.partition(":")
                if rest.strip() == "":
                    if key == "questions":
                        items = top["questions"] = []
                        cur_map = None
                    else:
                        cur_map = top[key] = {}
                else:
                    top[key] = _val(rest)
                    cur_map = None
                continue
            if items is not None and line.startswith("  - "):
                item = {}
                items.append(item)
                key, _, rest = line[4:].partition(":")
                item[key] = _val(rest)
            elif items is not None and line.startswith("    "):
                key, _, rest = line.strip().partition(":")
                item[key] = _val(rest)
            elif cur_map is not None:
                key, _, rest = line.strip().partition(":")
                cur_map[key] = _val(rest)
    return top


# ---------------------------------------------------------------- Kennzahlen
def kappa(pairs, cats):
    n = len(pairs)
    if n == 0:
        return None
    po = sum(1 for a, b in pairs if a == b) / n
    ca, cb = Counter(a for a, _ in pairs), Counter(b for _, b in pairs)
    pe = sum((ca[c] / n) * (cb[c] / n) for c in cats)
    return None if abs(1 - pe) < 1e-12 else (po - pe) / (1 - pe)


def wilson(k, n, z=1.96):
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (c - h, c + h)


def fmt(x, pct=True):
    if x is None:
        return "n/a"
    return (f"{x*100:.1f} %" if pct else f"{x:.3f}").replace(".", ",")


def tag(r):
    m = re.match(r"\s*(?:S\d:\s*)?\[U:(a|b|c|b2)\]", r or "")
    return m.group(1) if m else None


def load():
    docs = {}
    for p in sorted(glob.glob(os.path.join(QDIR, "*.yaml"))):
        if p.endswith(".rater2.yaml"):
            continue
        d = read_yaml(p)
        r2p = p[:-5] + ".rater2.yaml"
        r2 = {q["id"]: q for q in read_yaml(r2p)["questions"]}
        for q in d["questions"]:
            x = r2[q["id"]]
            q["class_rater2"], q["rationale2"] = x["class_rater2"], x["rationale"]
        assert set(r2) == {q["id"] for q in d["questions"]}, d["slug"]
        docs[d["slug"]] = d
    adj = {}
    ap = os.path.join(QDIR, "_adjudication.csv")
    if os.path.exists(ap):
        with open(ap, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row["class_final"].strip():
                    adj[row["id"]] = row["class_final"].strip()
    return docs, adj


def share(qs, key, cls):
    n = len(qs)
    return sum(1 for q in qs if q[key] in cls) / n if n else None


def FZ(qs, key):
    return share(qs, key, ("a", "b")), share(qs, key, ("a",))


def main():
    docs, adj = load()
    check = "--check" in sys.argv
    slugs = list(docs)
    allq = [dict(q, slug=s, type=docs[s]["type"]) for s in slugs for q in docs[s]["questions"]]
    for s in slugs:
        assert docs[s]["extraction"]["n_questions"] == len(docs[s]["questions"]), s
        assert all(q["class_rater1"] in "abc" and q["class_rater2"] in "abc" for q in docs[s]["questions"]), s
    if check:
        print(f"OK: {len(slugs)} Fragebögen, {len(allq)} Fragen")
        return

    # --- Tabelle je Fragebogen
    print("### Tabelle je Fragebogen\n")
    print("| Fragebogen | Typ | N | R1 a/b/c | R2 a/b/c | Übereinst. | Kappa 3 Klassen | Kappa F | Kappa Z |")
    print("|---|---|---|---|---|---|---|---|---|")
    for s in slugs:
        qs = docs[s]["questions"]
        n = len(qs)
        c1 = Counter(q["class_rater1"] for q in qs)
        c2 = Counter(q["class_rater2"] for q in qs)
        agree = sum(1 for q in qs if q["class_rater1"] == q["class_rater2"]) / n
        pr = [(q["class_rater1"], q["class_rater2"]) for q in qs]
        kF = kappa([("F" if a in "ab" else "N", "F" if b in "ab" else "N") for a, b in pr], "FN")
        kZ = kappa([("Z" if a == "a" else "N", "Z" if b == "a" else "N") for a, b in pr], "ZN")
        k3 = kappa(pr, "abc")
        t = lambda c: f"{c['a']/n*100:.0f} / {c['b']/n*100:.0f} / {c['c']/n*100:.0f} %"
        print(f"| `{s}` | {docs[s]['type']} | {n} | {t(c1)} | {t(c2)} | {fmt(agree)} | {fmt(k3,False)} | {fmt(kF,False)} | {fmt(kZ,False)} |")
    pr = [(q["class_rater1"], q["class_rater2"]) for q in allq]
    n = len(allq)
    c1 = Counter(q["class_rater1"] for q in allq)
    c2 = Counter(q["class_rater2"] for q in allq)
    agree = sum(1 for a, b in pr if a == b) / n
    kF = kappa([("F" if a in "ab" else "N", "F" if b in "ab" else "N") for a, b in pr], "FN")
    kZ = kappa([("Z" if a == "a" else "N", "Z" if b == "a" else "N") for a, b in pr], "ZN")
    t = lambda c: f"{c['a']/n*100:.1f} / {c['b']/n*100:.1f} / {c['c']/n*100:.1f} %".replace(".", ",")
    print(f"| **gesamt (gepoolt)** | | **{n}** | {t(c1)} | {t(c2)} | {fmt(agree)} | {fmt(kappa(pr,'abc'),False)} | {fmt(kF,False)} | {fmt(kZ,False)} |")
    print()
    print(f"Absolute Zählung gesamt: R1 a={c1['a']}, b={c1['b']}, c={c1['c']}; R2 a={c2['a']}, b={c2['b']}, c={c2['c']}.\n")

    # --- Varianten V1..V4
    biggest = max(slugs, key=lambda s: len(docs[s]["questions"]))
    variants = {
        "V1 gepoolt, alle": [q for q in allq],
        "V3 gepoolt ohne Typ K": [q for q in allq if q["type"] != "K"],
        f"V4 gepoolt ohne größten Fragebogen (`{biggest}`)": [q for q in allq if q["slug"] != biggest],
    }
    print("### Gesamtwerte F (Anteil a ∪ b) und Z (Anteil a)\n")
    print("| Variante | N | F R1 | F R2 | F konservativ (beide) | F liberal (einer) | F R1 unten–oben (Tags) | F R2 unten–oben (Tags) | Z R1 | Z R2 | Wilson-95-%-KI F (R1) |")
    print("|---|---|---|---|---|---|---|---|---|---|---|")

    def rng(qs, key, rkey):
        base = sum(1 for q in qs if q[key] in "ab")
        lo = base - sum(1 for q in qs if q[key] == "b" and tag(q[rkey]) == "c")
        hi = base + sum(1 for q in qs if q[key] == "c" and tag(q[rkey]) == "b")
        return lo / len(qs), hi / len(qs)

    def row(name, qs):
        n = len(qs)
        f1, z1 = FZ(qs, "class_rater1")
        f2, z2 = FZ(qs, "class_rater2")
        cons = sum(1 for q in qs if q["class_rater1"] in "ab" and q["class_rater2"] in "ab") / n
        lib = sum(1 for q in qs if q["class_rater1"] in "ab" or q["class_rater2"] in "ab") / n
        lo1, hi1 = rng(qs, "class_rater1", "rationale")
        lo2, hi2 = rng(qs, "class_rater2", "rationale2")
        k = sum(1 for q in qs if q["class_rater1"] in "ab")
        lo, hi = wilson(k, n)
        print(f"| {name} | {n} | {fmt(f1)} | {fmt(f2)} | {fmt(cons)} | {fmt(lib)} | {fmt(lo1)} – {fmt(hi1)} | {fmt(lo2)} – {fmt(hi2)} | {fmt(z1)} | {fmt(z2)} | {fmt(lo)} – {fmt(hi)} |")
    for name, qs in variants.items():
        row(name, qs)
    # V2 Makro-Mittel
    def macro(key, cls):
        vals = [share(docs[s]["questions"], key, cls) for s in slugs]
        return sum(vals) / len(vals)
    print(f"| V2 Makro-Mittel über {len(slugs)} Fragebögen | {len(slugs)} Dok. | {fmt(macro('class_rater1',('a','b')))} | {fmt(macro('class_rater2',('a','b')))} | n/a | n/a | n/a | n/a | {fmt(macro('class_rater1',('a',)))} | {fmt(macro('class_rater2',('a',)))} | n/a |")
    print()

    # --- nach Dokumenttyp
    print("### F und Z nach Dokumenttyp (Rater 1 / Rater 2)\n")
    print("| Typ | Fragebögen | N | F R1 | F R2 | Z R1 | Z R2 |")
    print("|---|---|---|---|---|---|---|")
    for ty, lab in (("L", "L Lieferantenfragebogen"), ("S", "S Selbstbewertung"), ("K", "K Klassifikator")):
        qs = [q for q in allq if q["type"] == ty]
        if not qs:
            continue
        f1, z1 = FZ(qs, "class_rater1")
        f2, z2 = FZ(qs, "class_rater2")
        print(f"| {lab} | {len({q['slug'] for q in qs})} | {len(qs)} | {fmt(f1)} | {fmt(f2)} | {fmt(z1)} | {fmt(z2)} |")
    qs = [q for q in allq if q["type"] == "L" and docs[q["slug"]]["ai_act_native"]]
    if qs:
        f1, z1 = FZ(qs, "class_rater1")
        f2, z2 = FZ(qs, "class_rater2")
        print(f"| L und AI-Act-nativ (Teilmenge von L) | {len({q['slug'] for q in qs})} | {len(qs)} | {fmt(f1)} | {fmt(f2)} | {fmt(z1)} | {fmt(z2)} |")
    print()

    # --- Abweichungen und Tags
    dis = [q for q in allq if q["class_rater1"] != q["class_rater2"]]
    print(f"### Abweichungen Rater 1 gegen Rater 2 ({len(dis)})\n")
    print("| ID | Wortlaut (gekürzt) | R1 | R2 | Begründung R1 | Begründung R2 | Entscheidung Altan |")
    print("|---|---|---|---|---|---|---|")
    for q in dis:
        txt = q["text"].replace("|", "/")
        txt = txt if len(txt) <= 150 else txt[:147] + "..."
        print(f"| `{q['id']}` | {txt} | {q['class_rater1']} | {q['class_rater2']} | {q['rationale'].replace('|','/')} | {q['rationale2'].replace('|','/')} | |")
    print()
    tg = [q for q in allq if (tag(q["rationale"]) or tag(q["rationale2"])) and q["class_rater1"] == q["class_rater2"]]
    print(f"### Übereinstimmende, aber von mindestens einem Rater als unsicher markierte Fragen ({len(tg)})\n")
    print("| ID | Wortlaut (gekürzt) | Klasse | Tag R1 | Tag R2 |")
    print("|---|---|---|---|---|")
    for q in tg:
        txt = q["text"].replace("|", "/")
        txt = txt if len(txt) <= 150 else txt[:147] + "..."
        print(f"| `{q['id']}` | {txt} | {q['class_rater1']} | {tag(q['rationale']) or '-'} | {tag(q['rationale2']) or '-'} |")
    print()

    # --- Stichprobe übereinstimmender Fragen (deterministisch)
    tagged_ids = {q["id"] for q in tg}
    agreed_b = [q for q in allq if q["class_rater1"] == q["class_rater2"] and q["class_rater1"] in "ab" and q["id"] not in tagged_ids]
    agreed_c = [q for q in allq if q["class_rater1"] == q["class_rater2"] == "c" and q["id"] not in tagged_ids]
    rnd = random.Random(20261003)
    samp = rnd.sample(agreed_b, min(10, len(agreed_b))) + rnd.sample(agreed_c, min(20, len(agreed_c)))
    print(f"### Optionale Stichprobe übereinstimmender Fragen gegen gleichgerichtete Fehler ({len(samp)})\n")
    print("| ID | Wortlaut (gekürzt) | Klasse beider Rater | Entscheidung Altan |")
    print("|---|---|---|---|")
    for q in samp:
        txt = q["text"].replace("|", "/")
        txt = txt if len(txt) <= 150 else txt[:147] + "..."
        print(f"| `{q['id']}` | {txt} | {q['class_rater1']} | |")
    print()

    # --- finale Klassen, falls Altan entschieden hat
    if adj:
        final = {}
        for q in allq:
            final[q["id"]] = adj.get(q["id"], q["class_rater1"] if q["class_rater1"] == q["class_rater2"] else None)
        open_ = [i for i, v in final.items() if v is None]
        print(f"### Auswertung mit menschlicher Entscheidung\n\nOffen: {len(open_)} Abweichungen ohne Entscheidung.")
        if not open_:
            n = len(final)
            f = sum(1 for v in final.values() if v in ("a", "b")) / n
            z = sum(1 for v in final.values() if v == "a") / n
            print(f"F (V1, final) = {fmt(f)}, Z = {fmt(z)}")
    else:
        print("### Auswertung mit menschlicher Entscheidung\n\nNoch keine Einträge in `eval/questionnaires/_adjudication.csv`.")


if __name__ == "__main__":
    main()
