# Key model research prompts (ChatGPT + Gemini deep research)

The board holds ~498 distinct key blank models (parsed from the shop's dictated
spreadsheet). For each one we eventually want, surfaced somewhere in the app as
help:

- a plain-language explanation of what the blank is and what it fits,
- manufacturer cross-references / equivalents (Ilco, Cole/Curtis, Silca, JMA,
  Kaba/Ilco, etc.),
- the keyway / blank family and which keyways can substitute for it,
- any cautions (restricted, high-security, look-alike but not interchangeable).

We are doing the research **separately** with two deep-research tools so we have
two independent passes to cross-check against each other (and against our own
later work). The two prompts below are tuned per tool but ask for the **same
output schema**, so the results line up column-for-column.

**Attach `scripts/keyModels.csv`** (columns: `code`, `display_names`,
`board_positions`) to each run. It is the authoritative model list. If the tool
cannot take a file, paste the CSV inline in chunks of ~100 rows and ask it to
continue until all rows are covered.

The single most important rule for both: **never invent a cross-reference or a
keyway. An honest "unknown / unverified" is worth more to us than a confident
guess, because a wrong equivalent means a miscut key.**

---

## Output schema (both tools must follow this exactly)

Return **JSON Lines** (one JSON object per line), one object per input `code`,
covering every row in the CSV. Do not merge or skip rows. Each object:

```json
{
  "code": "SC1",
  "display_names": "Kwikset ... (verbatim from the CSV)",
  "identified": true,
  "brand_system": "Ilco",
  "fits": "Schlage 5-pin residential locks (C keyway)",
  "category": "residential | commercial | padlock | mailbox | automotive | cabinet/furniture | unknown",
  "keyway": "Schlage C",
  "keyway_family": "SC1/SC4 (Schlage C)",
  "interchangeable_keyways": ["list of keyways/blanks that physically substitute, or []"],
  "equivalents": [
    {"brand": "Ilco", "ref": "1145", "confidence": "high|medium|low", "source": "URL or catalog name"},
    {"brand": "Silca", "ref": "SLE1", "confidence": "medium", "source": "URL"}
  ],
  "explanation": "1-2 plain sentences a counter clerk can read out.",
  "cautions": "restricted/high-security/look-alike notes, or empty string",
  "overall_confidence": "high|medium|low",
  "sources": ["URL", "URL"],
  "notes": "anything uncertain, ambiguous, or that needs a human to confirm"
}
```

Rules for the fields:

- `identified`: `false` when you cannot confidently determine what the blank is.
  When `false`, fill `explanation`/`notes` with why (ambiguous code, brand-only,
  not a key), leave `equivalents` as `[]`, and set `overall_confidence` to
  `"low"`. Do **not** pad an unidentified row with plausible-sounding data.
- `equivalents`: only cross-references you can trace to a real source (a
  manufacturer cross-reference chart, the Ilco/Kaba blank catalog, a
  distributor's interchange). Each entry carries its own `confidence` and
  `source`. If you have none, use `[]`.
- `interchangeable_keyways`: blanks that **physically cut and enter the same
  lock**, not just visually similar ones. If unsure, `[]`.
- `sources`: every URL or named catalog you actually used for this row. A row
  with `overall_confidence` above `"low"` must have at least one source.
- Never state a price, stock, or anything commercial. This is reference data
  only.

If a code looks like an OCR/dictation error (e.g. a 1 vs I, O vs 0 ambiguity,
which several of these have), say so in `notes` and give your best reading, but
keep `overall_confidence` low.

---

## Prompt A: ChatGPT (Deep Research / browsing)

> You are a professional locksmith reference researcher. I run a key-cutting
> counter and I am building an internal reference for our key blank board. I will
> give you a CSV of key blank codes (column `code`, with `display_names` showing
> how each was written on our board, and `board_positions`). For **every** row,
> research and return one JSON object per the schema I provide below.
>
> Method and standards:
> - Use authoritative sources: the Ilco / Kaba Ilco key blank catalog and cross
>   reference, Cole / Curtis interchange charts, Silca and JMA cross references,
>   and reputable locksmith/distributor references. Prefer manufacturer data over
>   forum posts.
> - For each cross-reference (equivalent) you list, you must be able to point to a
>   real source. Put that source on the entry. If you cannot source it, do not
>   list it.
> - Accuracy over completeness. If you are not sure what a code is, set
>   `identified: false` and explain. A wrong equivalent is worse than a blank.
>   Never fabricate a keyway, an equivalent, or a fit.
> - Many codes were dictated by voice and may contain 1/I or 0/O transcription
>   errors, or a brand prefix (Ilco, Cole, Curtis, CISA, Schlage, Medeco). Use the
>   `display_names` for disambiguation. Flag suspected transcription errors in
>   `notes`.
> - Work through the whole list. If it is long, process it in batches and keep
>   going until every `code` has exactly one output object. Do not summarize or
>   drop rows.
>
> Output: JSON Lines (one object per line), matching this schema exactly:
> [paste the "Output schema" block above]
>
> Here is the CSV:
> [attach or paste scripts/keyModels.csv]

## Prompt B: Gemini (Deep Research, with Google Search grounding)

> Act as a locksmith key-blank reference researcher with Google Search grounding.
> I will give you a CSV of key blank codes (`code`, `display_names`,
> `board_positions`) from a key-cutting shop's board. Produce a grounded reference
> for **every** row as one JSON object per line, following the exact schema below.
>
> Grounding and honesty requirements:
> - Ground every non-trivial claim in a real, citable source and put the URL(s) in
>   `sources` (and on each `equivalents` entry). Favor manufacturer catalogs and
>   cross-reference charts: Ilco / Kaba Ilco, Cole, Curtis, Silca, JMA, and
>   established locksmith distributors.
> - If Search does not give you a confident answer for a code, set
>   `identified: false`, keep `equivalents` empty, set `overall_confidence` to
>   `"low"`, and explain in `notes`. Do not guess a keyway or a cross-reference.
>   For us, "unknown" is a correct and useful answer; a fabricated equivalent is a
>   miscut key.
> - The codes were dictated by voice, so watch for 1/I and 0/O errors and brand
>   prefixes (Ilco, Cole, Curtis, CISA, Schlage, Medeco). Use `display_names` to
>   disambiguate and flag suspected transcription errors in `notes`.
> - Cover the entire list. Continue across batches until every `code` has exactly
>   one object. Never merge or skip rows.
>
> Output format: JSON Lines, one object per `code`, matching this schema exactly:
> [paste the "Output schema" block above]
>
> CSV follows:
> [attach or paste scripts/keyModels.csv]

---

## When the results come back

- Save each tool's output as `scripts/keyResearch.chatgpt.jsonl` and
  `scripts/keyResearch.gemini.jsonl`.
- A follow-up task can diff the two (agree / disagree per `code` and per
  `equivalent`), keep the agreements as high-confidence, and surface the
  disagreements and the `identified: false` rows for a human (Parsa) to settle.
- Only then load the vetted reference into the app (a `keyReference` collection
  keyed by `code`, shown as a help panel on the key card and in the Inventory
  lookup). Do not import an unreviewed pass as ground truth.
