# Openi Suite — Demo Runbook

A scripted, repeatable client walkthrough showing the suite working as one
platform. **Every identity in this scenario is synthetic and visibly
fictional** (`.example` domains, "(DEMO)" case names): the Bluewater Harbor
Consortium (client), Meridian Freight Ltd, Pier 7 Holdings, and Dana Voss are
inventions; the Waypoint telemetry is a deterministic synthetic dataset.

**The story:** an overnight break-in at the Pier 7 warehouse. Waypoint turns
raw geofence telemetry into escalated device leads; LinkView maps the
corporate network around the site; HashLens checks the client's mailboxes
against breach corpora; BriefBuilder assembles everything into client-ready
documents. The connective tissue is `openi.casepacket` v1.

Prep: current `main` of each app, `npm install && npm run build`, serve each
build (any static host; LinkView needs its Supabase instance — see its
`DEPLOY.md`). Browser: Chromium (print-to-PDF used twice).

---

## Act 1 — Waypoint: telemetry → triaged leads → casepacket (~5 min)

1. Waypoint → **New Case** → **Load sample dataset** → **Create case**. The
   synthetic "Pier 7 warehouse (Jacksonville) — overnight break-in (sample)"
   case opens with 928 observations / 41 devices.
2. Tour for the client: **Coverage** (the data-weather verdict), then
   **Population** (the anomalous cohort vs. residents/workers), then
   **Leads**.
3. On the top two leads (flagged by 4 independent questions): type a
   rationale — e.g. *"Staging-lot co-presence corroborated by client tip"* —
   and click **Escalated** (note the amber rail; rationale is mandatory).
4. Click **Export case packet (2 actioned)** → saves
   `pier-7-warehouse….openi-case.json`. Point out: priority travels on
   Waypoint's own axis; the coverage verdict rides as a caveat on every claim.

## Act 2 — BriefBuilder: packet → brief → client PDF (~7 min)

5. BriefBuilder → **↑ Import packet** → choose the Act-1 file. The confirm
   modal previews every incoming claim with its gradings — nothing is
   re-scored. **Import as new brief.**
6. Workspace opens: evidence and findings are populated; the Findings tab
   shows the approved/total ratio (Waypoint-triaged leads arrive approved,
   provenance preserved).
7. **Draft** tab → **Set up draft sections** → write two sentences into the
   Executive Summary (the analyst is always author of record).
8. **Export** tab: the preview *is* the client document — letterhead,
   document id, grading legend, provenance annex. **↓ Client document**,
   then **Print / PDF** for the paper artifact.

## Act 3 — HashLens: exposure check → client summary (~5 min)

9. HashLens (demo mode or a live instance) → **Match** workspace. Paste
   `hashlens/demo/discovered-hashes.txt` as the discovered set and
   `hashlens/demo/candidate-selectors.txt` as candidates → matches appear
   for the two Meridian Freight mailboxes (Gmail-style normalization shown
   with its confidence heuristic) and the demo password.
10. **Save to case** → "Bluewater Consortium exposure — DEMO".
11. Case results: point out masked-by-default values, the audited reveal,
    weak matches flagged amber. Export **Client summary** (suite-branded,
    plaintext-handling annex) and **Case packet**.

## Act 4 — LinkView: network → entity-bearing packet → entity annex (~7 min)

12. LinkView → open the demo case (or **Seed demo case**). Tour: entities
    with verification chips, the relationship graph, Admiralty-graded
    sources, corroboration scores.
13. Case **overview** → **SUITE HAND-OFF → Export case packet**. This packet
    carries the ADR-005 entity register: full records + relationships.
    (Works for synthetic cases; the client view deliberately refuses them.)
14. BriefBuilder → **↑ Import packet** → the modal now also previews
    *entities + relationships*. Import; open **Export**: the client document
    gains the **Entity annex** — register with aliases and verbatim
    verification statuses, plus the label-resolved relationship table.
15. Close by printing that brief to PDF: one investigation, four tools, one
    document the client can act on.

## Expected artifacts

- `pier-7-warehouse….openi-case.json` (Waypoint)
- Pier 7 client brief `.html` + PDF (BriefBuilder)
- HashLens client summary `.html` + case packet
- `bluewater-consortium….openi-case.json` (LinkView, entity-bearing)
- Bluewater client brief `.html` + PDF with entity annex (BriefBuilder)

## Talk-track anchors

- **Nothing is re-scored on exchange** — every app's judgment travels on its
  own named axis (Waypoint priority, LinkView verification, HashLens match
  confidence) with caveats attached.
- **The analyst is always author of record** — AI/engine output arrives
  marked and must be approved; the document says so.
- **Client-safe by construction** — HashLens masks by default; LinkView
  refuses to render synthetic cases as client briefings; exports carry the
  grading legend so the documents are defensible standalone.
