# LinkView — Live Schema Reference (read-only capture)

**Shapes only** (column/field names, types, enum values) — not algorithm
internals. LinkView is actively built in Lovable; **re-capture before freezing
the contract or building an exporter** (see §11 Drift Watchlist).

> Reference model that informs the kernel contracts (ADR-005). Descriptive, not a
> kernel spec. LinkView owns these tables and algorithms.

## 0. Capture ledger
- **Repo:** `OpeniOracle/connect-uncover-insight` (LinkView)
- **Captured commit:** `044b7509c8232ce14bf149c046f887f5f8e5de05` (`044b750`),
  branch `claude/openi-suite-architecture-2wx9y7`, tip dated 2026-06-15 01:49:55Z
- **Capture date:** 2026-06-15
- **Inspected:**
  - Migrations (14): `supabase/migrations/2026060311{0551,0607,1701},20260603121612,
    2026060603{4943,5556},2026060700{4521,4546},20260609165601,
    2026061102{1601,1623,1649},20260612021428,20260614012240` *.sql
  - Source: `src/lib/corroboration/scoring.ts`, `src/lib/corroboration.functions.ts`,
    `src/lib/methodology.ts`, `src/lib/resolution/{extract,match,normalize,schemas,parse}.ts`,
    `src/integrations/supabase/types.ts`
  - Enums, TS result types, and function return shapes (below)
- **Observed vs inferred vs unresolved:** marked inline as **[obs]**, **[inf]**,
  **[unresolved]**.

## 1. Postgres enums [obs]
- `entity_type`: person | organization | location | account | asset | event | other
- `source_kind`: url | document | dataset | human | other
- `evidence_kind`: screenshot | document | note | data | media
- `confidence_level`: low | medium | high | confirmed | likely | possible | unconfirmed | disputed | deconfliction_required  *(overloaded: how-sure **and** verification status)*
- `finding_status`: draft | review | published
- `timeline_event_type`: observation | communication | transaction | travel | meeting | publication | incident | other
- `case_status`: active | on_hold | closed | archived
- `case_priority`: routine | standard | priority | critical
- `app_role`: admin | analyst | viewer | super_admin | reviewer | client_viewer

## 2. Core tables (column → type) [obs]
**cases**: id, owner_id, name, code_name, client, classification(default CONFIDENTIAL), status(case_status), priority(case_priority), summary, description, investigation_type, subject, known_selectors text[], known_organizations text[], known_locations text[], deliverable_type, assigned_analyst, created_at, updated_at

**entities**: id, case_id, type(entity_type), name, aliases text[], summary, **attributes jsonb**, risk_level int(default 0), role, confidence(confidence_level), tags text[], analyst_notes, client_notes, created_at
- Identifiers/selectors are **not** first-class columns — they live in
  `attributes` jsonb and (pre-merge) in `resolution_proposals.selectors`. [obs]

**relationships** (graph edge): id, case_id, **source_entity_id**, **target_entity_id**, kind text(default associated_with), directed bool(default true), strength int(default 1), summary, why_it_matters, confidence(confidence_level), analyst_note, client_notes, observed_at, created_at

**sources** (admiralty): id, case_id, title, kind(source_kind), url, **reliability char(1) default 'C'** [obs; **no CHECK** — A–F is convention, not enforced [inf]], **credibility int default 3** [obs; **no CHECK** — 1–6 admiralty convention [inf]; exact UI range 1–5 vs 1–6 **[unresolved]**], notes, captured_at, created_at

**evidence**: id, case_id, source_id?, title, kind(evidence_kind), body, file_url, description, captured_at, tags text[], created_by?, confidence(confidence_level), source_type, source_url, access_date, **reliability text** (free text here, vs char(1) on sources [obs]), internal_notes, client_notes, file_name, file_size, file_mime, created_at

**evidence_links** (polymorphic join): id, **evidence_id**, **entity_id?**, **relationship_id?**, **finding_id?**, created_at — links one evidence row to an entity OR relationship OR finding, **independently of `findings.supporting_evidence`**. [obs]

**findings**: id, case_id, title, claim, confidence(confidence_level), status(finding_status), body, why_it_matters, supporting_evidence uuid[], related_entities uuid[], created_by?, analyst_notes, client_notes, created_at, updated_at

**timeline_events**: id, case_id, occurred_at, title, description, entity_ids uuid[], evidence_ids uuid[], event_type(timeline_event_type), confidence(confidence_level), created_at

## 3. Entity-resolution tables [obs]
**import_batches**: id, case_id, uploaded_by?, file_count, row_count, status(staged|reviewing|processed), summary jsonb, timestamps
**import_files**: id, batch_id, case_id, filename, schema_detected(darkside|tangles|generic), column_mapping jsonb, row_count, created_at
**staged_rows**: id, file_id, case_id, row_index, raw jsonb, normalized jsonb(ExtractedRow), created_at
**resolution_proposals**: id, batch_id, case_id, proposed_name, proposed_type(default person), **selectors jsonb** `{emails,phones,usernames,socials,addresses,companies,domains,breaches,locations,ips,credentials: string[]}`, match_score int(0–100), confidence(text 5/6-value), explanation, status(pending|approved|rejected|split|deconfliction|false_positive), source_row_ids uuid[], merged_into_entity_id?, timestamps
**proposal_evidence**: id, proposal_id, case_id, file_id?, row_index, field, raw_value, normalized_value, source_platform, created_at

## 4. Corroboration + audit tables [obs]
**corroboration_overrides**: id, case_id, target_type(entity|relationship|case), target_id?, override_score int(0–100)?, override_label text(≤64)?, justification text(≤2000)?, locked bool, status(active|confirmed|disputed|deconfliction_requested|cleared), created_by?, timestamps, UNIQUE(case_id,target_type,target_id)
**corroboration_audit_log**: id, case_id, target_type, target_id?, action, before_state jsonb?, after_state jsonb?, note?, actor_id?, created_at
**workspace_settings**: id, singleton, organization_name(default 'Openi Analytics'), logo_url, default_confidence_labels jsonb(`[confirmed,likely,possible,unconfirmed,disputed,deconfliction_required]`), preferences jsonb, updated_by?, timestamps

## 5. Corroboration OUTPUT shapes (TS — meaning, not formula) [obs]
**EntityScoreResult**: { score 0–100, label(confirmed|likely|possible|unconfirmed|deconfliction_required), baseScore, diversityBoost, reliabilityFactor 0.4–1.0, contradictionPenalty, contributions[{kind(IdentifierKind), value, points, tier(strong|moderate|weak), sourceCount, avgReliability(very_high|high|medium|low|unknown)}], diversity{totalObservations,uniqueSources,uniqueSourceTiers,independentSources,diversityBoost}, explanation, supportingSourceIds[] }
**RelationshipScoreResult**: { score, label, explanation, diversity{…}, endpointConfidence }
**InvestigationResult**: { caseConfidence 0–100, investigationMaturity 0–100, label, healthSummary, signals{corroboratedEntities, corroboratedRelationships, avgEntityScore, avgRelationshipScore, sourceDiversity, contradictions} }
**getCorroborationReport()**: { entities[{id,name,type,computed:EntityScoreResult,override|null,finalScore,finalLabel}], relationships[{id,kind,sourceEntityId,targetEntityId,sourceName,targetName,computed,override|null,finalScore,finalLabel}], investigation, sources[{id,title,kind,reliability}], sourceTiers[], deconflictionItems[{id|null,type(relationship|entity),label,score}], audit[], findings[{id,title,status}], timeline[] }
- **Score→label bands [obs]:** 90–100 confirmed · 75–89 likely · 60–74 possible · 40–59 unconfirmed · 0–39 deconfliction_required.
- **Both score and label are first-class** — the profile preserves both (score on `corroboration` axis, label on `verification` axis).

## 6. Deconfliction OUTPUT shape (TS) [obs]
**Deconfliction**: { level(warning|critical), kind(name_collision|weak_attribution|inferred_link|selector_ambiguous), message, refType(entity|relationship|finding), refId }

## 7. Resolution proposal OUTPUT (TS) [obs]
**Proposal**: { proposedName, proposedType('person'), selectors{11 string[] sub-arrays}, matchScore 0–100, confidence(5/6-value), explanation, rows[ExtractedRow], fileBreakdown{filename:count} }
**Selector**: { kind(email|phone|username|address|company|domain|social|breach|location|credential|ip|unknown), value, raw, field, platform? }
**ExtractedRow**: { rowIndex, filename, schemaDetected, name|null, nameNorm|null, company|null, city|null, country|null, selectors[Selector] }

## 8. Verification vs how-sure [obs]
- The `confidence` column (entities/relationships/evidence/findings/timeline),
  typed `confidence_level`, **carries verification-status values** (confirmed…
  deconfliction_required) plus low/medium/high — it is the **verification axis**
  (ADR-001 Addendum A). The profile preserves the **raw value verbatim** under
  `linkview.verification@1`; it is never collapsed to `openi.confidence@1`.
- The corroboration engine emits a numeric **score 0–100** plus a 5-value
  derived **label**.

## 9. Export / kernel surface [obs]
- **No structured export** (no toJSON/bundle/download for case/entity/
  relationship). Only CSV/XLSX **import** parsing (`parse.ts`).
- **No `@openi/*` reference anywhere.** LinkView neither consumes nor emits the
  kernel today. ⇒ a LinkView→bundle exporter is **greenfield-additive**
  (Lovable-safe edge module); the profile + validators live in the **kernel**.

## 10. Field ownership disposition
Where each captured field belongs once mapped:

| Field group | Base `openi.bundle@1` | `linkview.profile@1` | LinkView-local (`appExtensions.linkview`) |
|---|---|---|---|
| finding (claim, confidence, status, supporting_evidence, related_entities) | ✅ as `claims[]` | — | client_notes split |
| entity (id,type,name,aliases,attributes,confidence) | EntityReference base | ✅ full Entity (identifiers, attributes, resolution) | risk_level, role, client_notes |
| relationship (source/target/kind/directed/strength/confidence) | — | ✅ `relationships[]` (G1) | analyst_note, client_notes, observed_at |
| source (kind,url,reliability,credibility) | SourceReference base | ✅ full Source (reliability+credibility axes) | notes |
| evidence (kind,body,file_*,confidence) | EvidenceReference base | refined kinds | internal/client notes, file_* |
| evidence_links (polymorphic join) | — | ✅ `evidenceLinks[]` | (or fallback) |
| case header (name,classification,subject,known_*) | — | ✅ `case`/investigation object | deliverable_type, RLS/membership |
| timeline_events | — | ✅ `timeline[]` | — |
| corroboration score + label | grading axes | ✅ `corroboration`+`verification` axes + vocab | full breakdown/contributions |
| deconfliction result | — | ✅ `deconflictions[]` (G4) | — |
| resolution proposals/selectors | — | ✅ Entity.resolution | match internals |
| RLS / case_members / roles / workspace_settings | — | — | ✅ LinkView/Core-local |

## 11. Drift watchlist — recheck before building the exporter
Re-capture these at exporter time; flag any change against the kernel profile's
golden fixtures:
1. **`confidence_level` enum values** (migrations) — verification taxonomy is the
   spine of `linkview.verification@1`. Any added/removed value ⇒ update vocab.
2. **`sources.credibility` range** [unresolved] — confirm 1–5 vs 1–6 and whether
   a CHECK is added; sets `linkview.credibility@1` value set.
3. **`sources.reliability` / `evidence.reliability`** — confirm A–F and whether a
   CHECK lands; note the char(1) vs free-text divergence.
4. **`relationships` columns** — `kind` value set, `strength` semantics; the only
   new top-level shape (G1).
5. **Corroboration OUTPUT** (`scoring.ts`, `corroboration.functions.ts`) — the
   result field names (`score`,`label`,`finalScore`,`finalLabel`,
   `deconflictionItems`) feed the export mapping.
6. **Deconfliction OUTPUT** (`methodology.ts`) — `kind`/`level`/`refType` value
   sets feed `linkview.deconfliction@1`.
7. **resolution `selectors` sub-array set** (`extract.ts`) — feeds Entity
   identifiers; new selector kinds ⇒ extend.
8. **New migrations** after `20260614012240` — any new table/column.
Files to re-read: the 14 migrations, `scoring.ts`, `corroboration.functions.ts`,
`methodology.ts`, `resolution/{extract,match,schemas}.ts`,
`integrations/supabase/types.ts`.
