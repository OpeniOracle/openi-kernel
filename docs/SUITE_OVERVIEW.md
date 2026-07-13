# Openi Analytics — Suite Overview

_Plain-language summary of what the Openi suite does today. Describes only
capabilities that verifiably exist in the shipped code. Raw material for
client-facing descriptions — not marketing copy._

**Openi is an intelligence-analysis suite of four tools that share one
language.** An analyst can start an investigation in one tool and carry the
findings into another without losing meaning or re-keying data — the tools
exchange a single portable case file.

## The tools

- **Waypoint** turns raw location telemetry (commercial device data) into a
  short, reasoned list of devices worth investigating. The analyst asks
  investigative questions of the data; each device that answers accumulates
  reasons, and the analyst assigns a disposition with a required rationale.

- **LinkView** is an OSINT workspace for mapping people, organizations, and
  the relationships between them — with every claim tied to graded evidence
  and sources rated on the NATO Admiralty scale.

- **HashLens** checks email addresses and credentials against breach data.
  It is safe by default: values are masked, viewing a sensitive value is
  logged, and hash-only mode never stores plaintext at all.

- **BriefBuilder** assembles findings into a finished, client-ready
  document — with a grading key and a full provenance trail so the report
  stands on its own.

## What makes it one suite, not four apps

- **Portable case files.** Waypoint, HashLens, and LinkView each export an
  "Openi case packet"; BriefBuilder imports it and turns it into a brief.
  Findings, evidence, and entities travel intact.

- **Judgments never get distorted in transit.** Each tool grades its work on
  its own scale (Waypoint's lead priority, LinkView's verification status,
  HashLens's match confidence). When findings move between tools, those
  grades are carried verbatim, never silently converted into something they
  aren't.

- **The analyst is always the author.** AI or automated assistance is always
  marked as such and must be approved by the analyst before it becomes part
  of a report. Finished documents say so explicitly.

- **Client-ready by construction.** Reports carry a plain-language key
  explaining how to read the gradings, plus an annex tracing every finding
  back to its evidence. Sensitive data is masked or excluded from anything
  client-facing by default.

- **One consistent look.** All four tools share a dark, instrument-grade
  interface — one accent color for things you click, a distinct signal color
  for things that need attention — so an analyst moving between them is never
  relearning the controls.

## Honest boundaries (today)

- The tools exchange files an analyst moves between them; there is not yet a
  single sign-on across all four.
- BriefBuilder's optional AI assistance currently calls out from the browser
  and is intended for a trusted internal network until a server relay is
  added.
- LinkView is the most production-hardened (live database, access controls,
  continuous testing); the others range from solid to early-stage.
