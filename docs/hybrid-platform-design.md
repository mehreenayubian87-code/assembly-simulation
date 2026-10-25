# ASSEMBLY

## Project vision

A Hybrid Human-AI Simulation Platform for Global Health Diplomacy Education for University Students.

## Reference review and decisions (25 October 2026)

The supplied **WHO Basic Documents, 49th edition** is a 244-page institutional collection. The implementation focuses on the Constitution (Articles 9, 18–23, 24–28) and WHA procedure (committee roles, participation and Rules 69–73), rather than treating every document in the collection as a simulation instruction. This edition is a historical baseline; check amendments before teaching a particular year's formal proceedings. Source: https://apps.who.int/gb/bd/pdf_files/BD_49th-en.pdf

The **Global Model WHO 2025 WHA Simulation Handbook** (19 PDF pages) supplies an educational workflow: opening plenary, Committee A, technical briefing, paragraph-by-paragraph zero-draft review, bracketed disagreements, provisional agreement ad ref, committee recommendation and closing-plenary adoption. Printed pages 4–10 describe the process; 11–16 discuss drafting. Its example agenda is mental health and youth; ASSEMBLY retains its fictional vaccine-access scenario and adapts the process, not that agenda. The handbook's conference-specific simplifications are not treated as the entire set of WHO rules. Supplied source: `C:/Users/mehre/Desktop/WHO assembly/GMWHO25-WHA-Simulation-Handbook.pdf`.

**ICONSnet** provides a useful platform reference: role sheets, scenario briefs, proposals, facilitator injects, event logs and reflective reports. The ASSEMBLY workspace combines those ideas with its existing audiovisual chamber. It does not use ICONSnet software or claim affiliation. Source: https://icons.umd.edu/about/iconsnet

## Implemented in this release

- Procedure journey and distinctions between Member States, Board, Secretariat, experts and presiding officers.
- Evidence workspace separates fictional scenario inputs from procedural sources.
- Original zero draft: one preambular paragraph and three operative paragraphs addressed to Member States, partners and the Director-General.
- Editable wording, open/bracketed/agreed-ad-ref status and revision history.
- Committee recommendation separated from final plenary adoption.
- Human country delegates explicitly record plenary objections or no objection; an objection returns the exercise to consultation.
- Explanations of position that do not automatically block adoption.
- Rule-based coaching prompts and implementation owner/timing/indicator notes.
- Negotiated text, explanations, event record, provenance and planning notes included in the existing downloadable and savable report.

The resolution expresses recommendations. The existing resource allocation and financing bargain is labelled a fictional pledge annex. It is not presented as WHO authority to compel national resource transfers. The resource model remains illustrative, not empirically calibrated.

## Classroom plan (suggested 60–75 minutes)

1. 10 minutes: roles, evidence, institutional responsibilities and agenda.
2. 10 minutes: statements and technical briefing.
3. 20 minutes: paragraph consultation and numeric offers; discuss the supply inject.
4. 10 minutes: committee and plenary consideration.
5. 10–25 minutes: implementation, report and debrief.

Assess evidence use, distinction between institutional mandates, response to opposing interests, transparent compromise, implementation reasoning and critical assessment of automated advice. Use discussion and written reflection, not automatically generated grades. Agreement alone is not evidence of learning.

## Next phase: live Human-AI capability

The current release is a foundation for the hybrid platform, not a completed live-AI system. Existing authored synthetic speech and scripted numeric actors are not generative AI delegates. Rule-based prompts are labelled accordingly.

Before connecting a model, choose a provider, usage budget and classroom data policy. A server-side endpoint must verify Supabase identity and classroom membership/approved professor status, enforce per-user and per-class rate limits and keep the provider key outside GitHub Pages. Send only the minimum scenario text needed; do not send emails, classroom codes or reports by default.

Proposed roles for AI:

- Role-bound delegate for unassigned countries: suggest replies from the published mandate and evidence.
- Secretariat assistant: explain the source packet with source identifiers, distinguish facts from fictional assumptions and say when the packet cannot answer.
- Negotiation coach: ask reflective questions; never take the student's action automatically.

Every AI turn should be visibly labelled, retain model/version provenance and be reviewable. A student must explicitly accept a proposed text revision. Formal votes and adoption remain a separate controlled workflow; model output cannot directly alter state. Instructors should be able to disable AI and review its interventions. The fallback must be explicitly labelled scripted mode.

Evaluate hallucinated institutional authority, mandate drift, free-text injection, unsupported health claims, domination of student voices, latency and cost before classroom deployment. Compare human-only and AI-assisted conditions using the same learning outcomes and instructor rubric; do not claim validated educational effectiveness in advance.

## Deliberate limits

- Groups still share one screen; this is not synchronized multi-device multiplayer.
- Unassigned actors evaluate numeric mandates only; humans review free-text resolution wording.
- Paragraph review statuses are shared drafting records, not independently authenticated votes.
- Formal roll-call voting and its majority thresholds are explained but not implemented.
- Draft work is in-memory; the final report can be downloaded or explicitly saved to the existing account system.
- This is WHO-inspired, not endorsed by WHO and not a validated digital twin.
