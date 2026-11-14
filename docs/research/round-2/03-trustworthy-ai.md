# Trustworthy AI: where a model earns its place, and how each use must be built

Observed on 14 November 2026 (NZDT). Companion to `docs/research/regulatory-watch-sources.md` section 3, which set the product's stance: detection is a diff, a model may draft, a person approves.

The question: where would a language or vision model make Loop & Pool materially better in 2026, and how must each use be built so it can be trusted?

## 0. How this was done, and what was not

- **No open web search was possible.** The session's search allowance was already spent when this work began, so every source below was reached by its address, by a link on a page already open, or from the repo's earlier research. Papers and regulator pages published in 2026 that I did not already know how to find will have been missed. Section 10 lists the gaps.
- **Three levels of reading**, marked in the source tables:
  - **read in full**: the document itself was opened and read end to end (four PDFs: the Tenancy Tribunal's AI guidelines, the courts' guideline for non-lawyers, the Privacy Commissioner's AI guidance, NCAT Procedural Direction 7; and OAIC's tenancy page).
  - **section read**: the document was fetched whole and the named sections were read in their own words (four NZ Acts as XML; two long OAIC pages as text).
  - **page read**: a fetch tool returned the page and a small model extracted the facts asked for. Figures from benchmark pages and vendor documentation come this way. They were not cross-checked against a second copy.
  - **abstract only**: for arXiv papers, only the abstract page was read. Numbers quoted are the abstract's.
- **[U]** marks a claim that is unverified: recalled from memory, carried over from an earlier repo document without re-reading, or blocked when fetched.
- **No benchmark number in this document is invented.** Where no independent measurement was found, the text says so.
- Nothing was submitted to any form. Pages behind a bot challenge (MBIE, CanLII, Queensland Courts, the Royal Society) were left unread.
- Cost figures in section 9 are arithmetic on assumed token counts, not measurements. They are labelled as estimates.

## 1. The answer in one page

**The rule that sorts every candidate.** A model may *read*, *sort*, *phrase* and *translate*. It may not *supply law*, *decide about a person*, or *act*. Every use that survives has the same shape: a narrow input, an output bound to a schema, a check that code can run, a person who approves, and a screen that shows the working.

The evidence supports this line. The best general models still fail an all-or-nothing legal research test almost half the time (top score 55.77%, Vals Legal Research Bench, 11 November 2026). Purpose-built legal research tools with retrieval hallucinated on 17% to 33% of queries (Magesh et al.). No model reached the 80% bar on a benchmark of helping people without lawyers, which includes landlord and tenant problems (top score 76.37%, Vals Access to Justice, 10 November 2026). On reading documents, models are about as good as lawyers and both are far from perfect (64 to 75 against 71, Vals Legal AI Report, February 2025). On comparing photos the public evidence is thin and unflattering.

**Six uses worth building, in order:**

| # | Use | The one guardrail it cannot ship without |
|---|---|---|
| 1 | **Understanding the question** in Ask Loop and Ask Pool | The model returns only an intent from a closed list, or "none". It never writes a word of law. The calculators answer. |
| 2 | **Reading agreements and invoices** | The model points at the words. Code confirms the words are in the document and reads the value from them itself. A person confirms each field. |
| 3 | **Drafting messages from structured facts** | The model writes with placeholders and no digits. Code fills in names, dates and amounts. Statutory notices stay templates. |
| 4 | **Translating fixed content** (rule explanations, repair steps, notes to notices) | A qualified person signs each string. A translation goes stale and is hidden the moment its English changes. English is the record. |
| 5 | **A second reader on repair reports** | It can raise urgency and never lower it. The keyword rules stay the floor, and the reason it gives must quote the renter's own words. |
| 6 | **Inspection photo notes** | Suggestions only, confirmed by the person standing in the room. Never a score, a cause, a cost, or the word "damage" as a finding. Build last, behind a published test. |

**Three uses to refuse:**

1. **A free-form legal assistant**: answers from the model's own knowledge or open retrieval, case-law lookups, "what are my chances at the Tribunal".
2. **Scoring, ranking or summarising rental applicants.**
3. **Verdicts from photos**: who caused it, fair wear and tear or damage, how much to claim from the bond.

Section 6 gives the reasons and four more refusals.

**Two findings that change the build plan:**

- **Every live model call needs a backend.** The product is a static bundle today. An API key cannot sit in a browser, and the vendor rejects browser calls outright for organisations on zero data retention. The only uses that need no backend are those that run at build time or in CI: the existing law-change draft, and translating fixed content with a human reviewer.
- **The cost is small and lopsided.** At 1,000 landlords the six uses come to roughly US$4,400 a year in model fees, about US$4.40 per landlord. Inspection photos are 73% of that. Without them the total is about US$1,200 a year. People's time (reviewing, translating, building test sets) will cost far more than tokens.

## 2. The evidence, by capability

### 2.1 Answering legal questions, with and without retrieval

| Finding | Figure | Source | Reading |
|---|---|---|---|
| Legal research products built on retrieval still hallucinate | Between 17% and 33% of queries (Lexis+ AI, Westlaw AI-Assisted Research, Ask Practical Law AI); first preregistered evaluation | Magesh et al., https://arxiv.org/abs/2405.20362 (submitted 30 May 2024) | abstract only |
| Same study, per tool | Lexis+ AI and Ask Practical Law AI wrong more than 17% of the time; Westlaw more than 34%. Two kinds of failure: the law stated wrongly, and the law stated rightly with a source that does not support it | https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-or-more-benchmarking-queries (updated 30 May 2024) | page read |
| General models on specific legal questions | 58% to 88% hallucination | Dahl et al., https://arxiv.org/abs/2401.01301 | **[U]** carried from `regulatory-watch-sources.md` 3.4, not re-read |
| Agentic legal research by current models (US law, 413 expert questions, results on 208) | Top all-pass score 55.77%. Mean all-pass by area runs from 16.2% (family) to 49.7% (health). A weighted score above 80% can hide a missed required element | https://www.vals.ai/benchmarks/legal_research (updated 11 Nov 2026) | page read |
| Legal research products against lawyers (US law, about 200 questions, July 2025) | AI products 74% to 78% weighted; lawyers 69%. Accuracy 78% to 81%. Most products scored 14 points lower on multi-jurisdiction questions | https://www.vals.ai/industry-reports/vlair-10-14-25 (14 Oct 2025) | page read |
| First point of contact for people without a lawyer (504 scenarios from legal-aid queries, six US states, housing included) | Top 76.37%; range 65.56% to 76.37%; none reached the 80% bar. Deadline criteria met 65% to 81% of the time. Referral to a lawyer 42% to 73%. Models built answers on facts they had not asked about | https://www.vals.ai/benchmarks/a2j (updated 10 Nov 2026) | page read |
| AI assistants answering questions about the news (over 3,000 responses, 14 languages) | Almost half had at least one significant issue; a third had serious sourcing problems; a fifth had major accuracy problems | https://www.ebu.ch/research/open/report/news-integrity-in-ai-assistants (21 Oct 2025) | page read |
| Court filings with invented material | 2,292 cases worldwide as at 8 Nov 2026; 7 in New Zealand, 112 in Australia; 1,315 involved a self-represented person, 912 a lawyer | https://www.damiencharlotin.com/hallucinations/ | page read; the NZ cases could not be listed |

What this means here. All of the measured work is on United States law. The New Zealand courts' own guideline says chatbots appear to have had little training on New Zealand law and cannot produce documents that meet New Zealand court or tribunal requirements (7 December 2023, read in full). Nothing found suggests a model would do better on the Residential Tenancies Act than on the US questions above. The failure that matters most for a first-time landlord is the quiet one: an answer that is mostly right and misses the deadline.

### 2.2 Reading fields out of documents

| Finding | Figure | Source | Reading |
|---|---|---|---|
| Data extraction from legal documents, tools against lawyers | Lawyers 71.1 ± 3.2; four tools 64.0 to 75.1 | https://www.vals.ai/vlair (updated 27 Feb 2025) | page read |
| Question answering over a document | Lawyers 70.1 ± 5.2; tools 72.7 to 94.8 | same | page read |
| Reading tax certificates supplied as page images, including one calculated figure (1,258 documents) | Top 72.06%; many models 66% to 69%; weakest 3.46%. Archived 1 Sep 2026 as saturated. Some models did not follow the required JSON shape | https://www.vals.ai/benchmarks/mortgage_tax | page read |
| Questions over credit agreements of 200 pages or more | Top 73.19% (as at 12 Aug 2026, archived). Hard cases: definitions that live in another section, mangled tables in PDF text, excerpts that do not start at page 1 | https://www.vals.ai/benchmarks/corp_fin_v2 | page read |
| Vendor's own limits | Scanned PDFs with no text layer cannot be cited. Images that are low quality, rotated or very small may be misread | https://platform.claude.com/docs/en/build-with-claude/citations , https://platform.claude.com/docs/en/build-with-claude/vision | page read |
| Parsing benchmark for varied PDF layouts | Exists and covers handwritten notes and dense layouts; the abstract gives no headline number | OmniDocBench, https://arxiv.org/abs/2412.07626 (CVPR 2025) | abstract only |

No independent measurement was found for New Zealand tenancy agreements or tax invoices. The benchmarks above are harder than "find the weekly rent on a standard form", so a clean, typed agreement should do better than 72%. Whether it does, and by how much, is unknown until it is measured on real documents. The design in 5.2 assumes a field can be wrong and makes each wrong field cheap to catch.

### 2.3 Describing and comparing photos

| Finding | Figure | Source | Reading |
|---|---|---|---|
| Understanding several images together (2,600 questions, 12 tasks) | Best models 68.0% and 49.3% | MuirBench, https://arxiv.org/abs/2406.09411 (June 2024) | abstract only |
| Comparing two images across eight kinds of difference (about 40,000 pairs) | The authors report notable shortcomings; no figure in the abstract | MLLM-CompBench, https://arxiv.org/abs/2407.16837 (NeurIPS 2024) | abstract only |
| Seven very simple visual tasks (do two circles overlap, how many lines cross) | Four leading models averaged 58.07%; best 77.84%; people are expected to score 100% | https://arxiv.org/abs/2407.06581 (revised Mar 2025) | abstract only |
| Models answer from what they expect, not what is shown | 17.05% average accuracy counting features in images altered to contradict expectation; removing the background nearly doubled accuracy | https://arxiv.org/abs/2505.23941 (v4, Apr 2026) | abstract only |
| Insurance tasks from images | Good general understanding; struggled with detailed risk rating and loss assessment; hallucinated in image understanding | https://arxiv.org/abs/2404.09690 (Apr 2024) | abstract only |
| Vendor's own limits | Localisation is approximate; counting is approximate; it cannot tell whether an image is AI-generated; do not use for tasks needing perfect precision without human oversight | https://platform.claude.com/docs/en/build-with-claude/vision | page read |

Most of these studies tested models that are now two generations old. Current models are probably better at vision; nothing read here shows by how much. And **no public benchmark was found for the actual job**: the same room photographed six months apart from a different angle in different light, and the question "what changed". The bias study is the most relevant warning. A model that expects a wall to be clean is the wrong witness for a scuff.

### 2.4 Summaries and plain-language drafts

| Finding | Figure | Source | Reading |
|---|---|---|---|
| Summaries that contradict their source, measured by an automated judge over 7,700 articles | The newest large models listed from the three main vendors: 6.5% to 13.6%; Claude Opus 5.5 9.9%; best listed model 1.8%; worst 24.2% | https://github.com/vectara/hallucination-leaderboard (updated 22 Oct 2026). Vendor-run; the judge is a model | page read |
| Summarising legal documents, tools against lawyers | Lawyers 50.3 ± 3.6; tools 58.9 to 77.2 | https://www.vals.ai/vlair | page read |
| Building a chronology | Lawyers 80.2 ± 3.6; tools 66.9 to 80.2. One of three tasks where no tool beat the lawyers | same | page read |
| Marking up changes to a contract | Lawyers 79.7; tools 53.6 and 65.0 | same | page read |
| What the Tenancy Tribunal has seen | Claims where AI produced, or added to, unnecessarily large volumes of material; misstated facts or timelines | Principal Tenancy Adjudicator's guidelines (link in section 7.1 of this document) | read in full |

Roughly one summary in ten carrying an unsupported statement is fine for a draft a person edits and useless for anything sent unseen. A model given five facts and asked for four sentences has less room to drift than one summarising a 24,000-word article, but that easier case was not measured anywhere I could find.

### 2.5 Sorting urgency

| Finding | Figure | Source | Reading |
|---|---|---|---|
| Members of the public using a model to decide what a medical problem is and what to do (1,298 people, ten scenarios) | The models alone named the condition in 94.9% of cases but chose the right course of action in only 56.3%. People using the models named a relevant condition in fewer than 34.5% and chose the right action in fewer than 44.2%, no better than the control group | Bean et al., https://arxiv.org/abs/2504.18919 (Apr 2025) | abstract only |
| A renter's experience of a property chatbot | A flooded hallway brought a crew in about an hour. A ceiling leak got a promise of a work order, then a phone transfer that hung up, and no one came | NPR via https://www.wamc.org/2026-09-28/chatbots-are-becoming-a-new-reality-for-renters (28 Sep 2026) | page read |

No independent measurement of repair triage was found. The medical study is the nearest analogue and its lesson is specific: knowing what something is and judging how urgent it is are different skills, and the second is where models were weakest even before a person was involved.

### 2.6 Translation

| Finding | Figure | Source | Reading |
|---|---|---|---|
| Which of the five languages have a standard public test set | FLORES-200 includes Māori, Samoan, Hindi and Chinese (both scripts). **Tongan is not in it** | https://github.com/facebookresearch/flores/blob/main/flores200/README.md | page read |
| A general model against dedicated translation systems across 204 languages | The model was behind for 84.1% of languages; how much data a language has was the strongest predictor | Robinson et al., https://arxiv.org/abs/2309.07423 (Sept 2023; old) | abstract only |
| A later model on low-resource languages | Stronger, and less dependent on data volume; the authors found signs the standard test set had leaked into training, so scores on it may flatter | Enis and Hopkins, https://arxiv.org/abs/2404.13813 (Apr 2024) | abstract only |
| The field's own verdict | The 2024 shared-task report is titled, in effect, that the LLM era is here and translation is not solved. 11 language pairs; which ones was not checked | https://aclanthology.org/2024.wmt-1.1/ (Nov 2024) | page read |
| Official translations already exist | Tenancy Services publishes resources in 21 languages, including te reo Māori, Samoan, Tongan, Simplified and Traditional Chinese, and Hindi | https://www.tenancy.govt.nz/about-tenancy-services/translated-resources/ | page read |

Mandarin and Hindi are high-resource languages and machine translation of everyday messages is serviceable. For te reo Māori, Samoan and Tongan the public evidence is old, thin or absent, and for Tongan there is not even a shared yardstick. The courts' guideline adds that chatbots generally do not account for the cultural values and practices of Māori and Pasifika.

### 2.7 What the evidence does not cover

- Anything on New Zealand or Australian tenancy law.
- Inspection photo comparison, repair triage, tenancy agreements, NZ invoices.
- Te reo Māori, Samoan and Tongan translation by 2026 models.

For each of these the product would be the first to measure. That is a cost (section 4, the test sets) and an opportunity: publishing the numbers is something no competitor found does (section 8).

## 3. Guardrail patterns and what each is shown to do

| Pattern | What it gives you | What it does not | Evidence | Already in this repo |
|---|---|---|---|---|
| **Quote verification** | A claim is kept only if its supporting words are in the source, checked by code | It cannot tell whether the words support the claim. That is the "misgrounded" failure in Magesh et al. | Vendor guidance recommends quote-first answers and retracting any claim with no quote, and says plainly that these techniques reduce hallucination without removing it: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations | `keep()` in `scripts/reg-watch.mjs`; `Found<T>.from` in `src/domain/agreementText.ts` |
| **Value read from the quote by code** | Removes number, date and unit slips: the model locates, the parser reads | Does nothing if the model points at the wrong passage (the bond clause instead of the rent clause) | Follows from the failure modes listed in `regulatory-watch-sources.md` 3.4 | `parseDate` and `amount` in `agreementText.ts` |
| **Citations API** | Each cited passage is extracted by the API, so the pointer is guaranteed to be a real location in a supplied document | Not every statement gets a citation; the documentation says to check that each field has a value and at least one citation because the API guarantees neither. Scanned PDFs cannot be cited. Cannot be combined with structured outputs | https://platform.claude.com/docs/en/build-with-claude/citations | No |
| **Structured outputs** | The reply always parses and matches the schema; enums hold | Says nothing about whether the values are true. Numeric and length limits in a schema are not supported, so code must still check ranges | https://platform.claude.com/docs/en/build-with-claude/structured-outputs | `zodOutputFormat` in `scripts/reg-watch.mjs` |
| **Abstention** | "None of these" and "cannot tell" as ordinary outputs that route to a person | Models do not reliably know when they do not know; a 2025 survey treats dependable abstention as open research | https://arxiv.org/abs/2407.18418 (TACL). Practical consequence: make abstention structural (closed lists, failed checks) and do not rely on the model volunteering it | `copilot.ts` falls through to "does not know" and the taught-answer queue |
| **A person approves** | Accountability, and a chance to catch what code cannot | People overseeing automated systems miss errors. The Privacy Commissioner calls this automation blindness and says a human in the loop may not be enough on its own | OPC, AI and the Information Privacy Principles (Sept 2023), read in full | Rulewatch two-reviewer rule; healing playbooks that ask first |
| **Test sets and replay** | A number to quote, a way to notice a model or prompt change making things worse | Only as good as the cases in it. A model used as judge must itself be checked against people: one benchmark reports its judge agreeing with a panel of three experts 87.4% of the time, against 83.4% for an average single expert | https://platform.claude.com/docs/en/test-and-evaluate/develop-tests ; https://www.vals.ai/benchmarks/legal_research | Calculator fixtures pinned to Tenancy Services' worked examples; `triage.test.ts`; `agreementText.test.ts` |
| **Isolation of untrusted content** | Limits what a hidden instruction in an uploaded document or fetched page can cause | Cannot be made airtight by filtering. Twelve published defences were each bypassed, most with attack success above 90%, once attackers adapted. The UK's cyber agency says the flaw may never be fully fixed because a model does not separate instruction from data, and advises designing so a successful injection can do little | https://arxiv.org/abs/2510.09023 ; https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection (8 Dec 2025); https://genai.owasp.org/llmrisk/llm01-prompt-injection/ ; design patterns in https://arxiv.org/abs/2506.08837 | Reg-watch gives the model no tools and no write access |

The last row decides the architecture. If a tenancy agreement PDF carries white-on-white text telling the model to report a lower bond, no filter will reliably stop the model reading it. What stops the harm is that the model's output can only fill a draft form, each field must quote visible words that code can find, and a person confirms. Design so that an injected model can be wrong but cannot act.

## 4. The harness every use shares

Build this once, before the first feature. Each item is a rule the code enforces.

1. **One server endpoint per use. No general chat endpoint.** Each takes a typed request and returns a typed result. The API key lives on the server. This is the new seam in `docs/ARCHITECTURE.md`'s production table: every mutation that becomes a server action is where a model call may sit.
2. **The model has no tools and no write access.** It cannot send, serve, save, pay or fetch. Its output is a proposal that lands in a draft or a queue.
3. **Every output is bound to a schema with closed lists** wherever a list can be closed: intents, issue keys, hazard keys, ledger categories, rule keys. "None" is always a member.
4. **Every factual field carries its evidence**, and code checks the evidence before a person sees it. Failed checks are dropped or shown as failed, never passed through.
5. **Uploaded and fetched content is data.** It goes in a clearly marked block. Nothing in it changes what the endpoint is allowed to return.
6. **Model output is recorded as model output.** Any stored artefact keeps `draftedBy` (model id and prompt version) next to `approvedBy`, the way a notice already records the pack version that produced it.
7. **A golden set per use lives in the repo** beside the existing tests, and runs whenever the model id or the prompt changes. Model ids are pinned snapshots. The vendor's stated retirement dates for the current four are no sooner than September to November 2027, so a forced re-test is at most a year away (https://platform.claude.com/docs/en/about-claude/models/overview).
8. **Confidence is computed from evidence, never taken from the model**: did the quote verify, did the regex agree, did the arithmetic balance.
9. **Review is designed to be effective.** High-impact fields are confirmed one at a time with the source words beside them. There is no "accept all" over rent, bond, dates or urgency. A sample of approved items is re-checked by a second person. Accept, edit and reject counts per field are kept, which is the same learning-by-counting that `src/domain/healing.ts` already uses.
10. **Failure is ordinary.** If the model call times out or returns "none", the screen works exactly as it does today. No safety information ever waits on a model.
11. **The screen says what happened**: what was drafted by a model, from which facts or words, and who confirmed it. `<Why>` and `<Working>` already carry this for rules and dates.
12. **Personal information is minimised before the call**: opaque labels for homes and people where the task allows, placeholders in drafts, photos checked for people before upload where possible.

## 5. Candidate uses

Costs are per use in US dollars at the vendor's published prices on 14 November 2026 (section 9), with the assumptions stated there.

### 5.1 Understanding the question (Ask Loop, Ask Pool)

**The job.** Today `INTENTS` in `src/domain/copilot.ts` recognises a question by regular expression. "Can I put the rent up" matches. "My mortgage went up, what can I pass on" does not, and the landlord is told the assistant does not know. A model can map far more ways of asking onto the same verified answers. This is the cheapest route to "instant expert": the expertise is already in the pack and the calculators; what is missing is hearing the question.

**Evidence and failure rate.** Section 2.1. Models answering legal questions themselves are wrong too often to ship. Classifying a question into one of the 24 intents the file defines today is a far easier task, but its error rate here is unmeasured. The A2J finding that models assume facts they did not ask about is the failure to design against.

**Checked mechanically.**
- Output is `{ intent, tenancyRef, missing[] }`, each from a closed list, with `none` allowed. The schema guarantees the shape.
- The answer text is produced by the existing `answer()` functions. The model's words never reach the user in the first version.
- Where the regex and the model disagree, both are logged and the case joins the test set.
- `missing` comes from a closed list of clarifying questions ("Which home?", "Is it fixed-term or periodic?"). The assistant asks instead of assuming.

**A person approves.** Not per answer; volume is too high, which is exactly why the model may not supply facts. The team reviews every `none` in `src/screens/admin/Assistant.tsx` (already built) and a weekly sample of routed questions.

**The screen must show.** How the question was understood, in a line the asker can correct ("Answering: a rent increase for the Kea Street home. Not what you meant?"). Then the answer with its figures, citations and "last checked" date, as now.

**Later, optionally: phrasing.** A second call may rewrite the structured `Answer` into a conversational reply. Code then checks that every number, date, amount and citation label in the reply appears in the `Answer` it was given, and falls back to the template text if not. The structured answer stays visible beneath. Do this only after the router has a measured record.

**Never delegated.** Any statement of law, any date or amount, any prediction of an outcome, any advice on how to run a Tribunal case (see section 7, reserved areas of work).

**Privacy and law.** The question text is typed by the user and may name people. Tell users a model reads their question (OPC expectation 4). Refer to homes by opaque label. Use a model whose conversation content is not retained by default (section 9).

**Cost.** About US$0.0002 per question on the smallest current model; about US$18 a year at 78,000 questions. On the mid model, about US$350 a year.

**Attaches at.** `src/domain/copilot.ts` (`Intent.test` becomes one of two recognisers; keep the regex as the offline fallback and the cross-check), `src/screens/admin/Assistant.tsx` (its test bench becomes the runner for the golden set). **Backend: yes.**

### 5.2 Reading agreements and invoices

**The job.** A landlord adding a home uploads the tenancy agreement and retypes nothing. Later, a photographed invoice becomes a ledger line with supplier, date, total, GST and a suggested category. `src/domain/agreementText.ts` already does the first by pattern and returns each fact with the words it came from. Patterns break on unusual wording, scans and property managers' own templates.

**Evidence and failure rate.** Section 2.2. Expect models to be about as reliable as a careful person on hard documents (64 to 75 on a scale where lawyers scored 71) and markedly better on clean standard forms, with no measurement yet for the documents that matter here.

**Checked mechanically.**
- Each field comes back as `{ quote, page }`. The quote must be an exact substring of the text the browser extracted from the PDF, after whitespace is normalised. This is the existing `Found<T>` shape.
- **The value is read from the quote by the existing parsers** (`parseDate`, `amount`), not taken from the model. If code cannot read a value out of the quoted words, the field is shown as "found these words, could not read a figure".
- Cross-checks from the rule pack and arithmetic: bond against the pack's cap, start before end, invoice lines summing to the total, GST consistent with the total at the pack's rate.
- Regex result and model result side by side when they differ.
- A scanned document has no text layer, so no quote can be verified. Each field is then shown beside a crop of the page, labelled as read from a picture and not machine-checked, and confirmed singly.
- Ledger category from a closed list, as a suggestion. `category` is a free string in `src/domain/types.ts` today; the list in `docs/research/nz-tax-privacy-payments.md` 1.5 would have to become a type first.

**A person approves.** Every field, before anything is saved. `src/screens/loop/AddHome.tsx` already shows where each fact came from; keep that and remove any way to accept rent, bond and dates in one tap.

**The screen must show.** The words each value was read from, highlighted in the document. Which fields the two readers agreed on. For a clause the model flags, the clause and the pack rule it may touch, with the pack's own text.

**Clause flags, as a careful extension.** The model may point at clauses that might conflict with a rule, choosing from a closed list of rule keys and quoting the clause. It says "worth checking against this rule"; the pack says what the rule is. The screen must state that nothing flagged is not a clean bill. This overlaps `src/domain/rules/text.ts`'s clause scanner and should feed it, not replace it.

**Never delegated.** Whether a clause is lawful. Whether a tenancy is fixed-term or periodic when the document is ambiguous (abstain). Whether an expense is deductible or capital. The final value of any field.

**Privacy and law.** An agreement holds tenants' names and contact details; an invoice may hold a sole trader's. Under Privacy Act 2020 s 11 a provider that only processes on your behalf is not a separate holder, and the OPC says using an offshore processor is not an overseas disclosure so long as the provider does not use the information for its own purposes; the platform remains responsible either way. OPC expects a privacy impact assessment first, transparency, and that the tool neither retains nor discloses what is put in. Whether the platform's own handling of a landlord-uploaded document is an indirect collection under IPP 3A depends on whether it acts only on the landlord's behalf; OPC's IPP 3A page has a section on acting-on-behalf arrangements that should be read with counsel before launch. In Australia, OAIC says privacy obligations attach to what goes into an AI system and to what comes out, including wrong output about a person.

**Cost.** Agreement, text only: about US$0.09 on the mid model. With page images: about US$0.14. Invoice: about US$0.017 on the mid model, under a tenth of a cent on the smallest. About US$230 to US$360 a year for agreements and US$25 to US$510 for invoices at the assumed volumes.

**Attaches at.** `src/domain/agreementText.ts`, `src/screens/loop/AddHome.tsx`, `src/screens/loop/property/Records.tsx`, the ledger types in `src/domain/types.ts`; and `src/screens/admin/Migration.tsx`, where suggesting which column of an imported rent roll is which is the same pattern with a smaller risk. **Backend: yes.**

### 5.3 Drafting messages from structured facts

**The job.** A first-time landlord knows rent is nine days late and does not know how to say so. The product already knows the facts and the rule. A model can turn them into a message that is firm, kind and plain, in the landlord's voice, and can write the short covering note that explains a formal notice in ordinary words.

**Evidence and failure rate.** Section 2.4. About one grounded summary in ten carries an unsupported statement on a long-article benchmark. Short drafts from a handful of facts are an easier case that has not been measured.

**Checked mechanically.**
- **The model never sees or writes the facts.** It receives a description of the situation and a list of permitted placeholders (`{TENANT_FIRST_NAME}`, `{AMOUNT_OWING}`, `{DATE_DUE}`), and must write using only those. Code rejects any draft containing a digit or an unknown placeholder, then substitutes the real values. A number cannot be slipped because the model was never given one, and no personal information left the server.
- **Legal sentences are not the model's.** Where a message needs to state a rule, the pack's own plain-English text is inserted as a fixed block with its `<Why>`. The model writes around it.
- A length cap.

**A person approves.** Always. The sender reads, edits and sends. Nothing is sent on a schedule from a model draft.

**The screen must show.** That this is a draft written by a model, the facts it was built on, and the rule block marked as fixed.

**Never delegated.** The text of any statutory notice: `src/domain/notices.ts` produces it from templates and `NoticeDoc.tsx` stores exactly what was shown. Dates, amounts, any statement of what the law requires, any threat of action.

**Privacy and law.** The Privacy Commissioner's AI guidance uses this very case, a landlord writing to tenants with a text generator, and says the landlord should avoid putting personal information into the tool. The placeholder design meets that. Fair Trading Act s 9 applies to what the product says in trade; a draft that misstates a tenant's obligations is the landlord's message and the platform's product.

**Cost.** About US$0.012 a draft on the mid model; about US$290 a year at 24,000 drafts.

**Attaches at.** The mutations that record an arrears event, a repair reply or a change request (`src/data/*mutations.ts`), with `src/domain/notices.ts` as the line the model does not cross. **Backend: yes.**

### 5.4 Translation

**The job.** A renter who reads Samoan or Mandarin more easily than English should be able to understand what a notice means, how to try the safe repair steps, and what their landlord just wrote.

**Evidence and failure rate.** Section 2.6. Serviceable for Mandarin and Hindi. Unproven for te reo Māori and Samoan with current models. Unmeasurable against a public yardstick for Tongan.

**Two tiers, built differently.**

*Tier A, fixed content, no backend.* The pack's plain-English rule texts, the self-help steps in `src/domain/triage.ts`, the explanatory notes that accompany notices, and the interface. A model drafts each string once, offline. A qualified translator for that language corrects and signs it. The translation is stored beside the English with who reviewed it and when, and is tied to the English it was made from: when the English changes, the translation is marked stale and the screen falls back to English until it is reviewed again. This is the rule pack's own discipline applied to language. Where Tenancy Services already publishes the material in that language, link to the official version first.

*Tier B, messages, needs a backend.* A courtesy translation of what a landlord or renter typed. Checked by code: every digit sequence in the original appears in the translation. Shown with the original always attached, labelled as machine translation, and with a back-translation shown to the sender before sending so they can see how it reads. Offer it for Mandarin and Hindi first. Hold te reo Māori, Samoan and Tongan at tier A until native speakers have scored a test set.

**A person approves.** Tier A: the reviewer, per string. Tier B: the sender, who sees the back-translation.

**The screen must show.** Which language is the record (English), who reviewed a fixed translation and when, or that a message translation was made by a machine.

**Never delegated.** The legally operative text of anything. A served notice is the English document; the translation explains it. Translating evidence for the Tribunal.

**Privacy and law.** The Privacy Commissioner expects engagement with Māori about tools that affect them and notes concern about overseas systems that do not work accurately for Māori. Te reo Māori content should be made with, and reviewed by, Māori translators. **[U]** Te Hiku Media's work on te reo language technology and data sovereignty is the obvious reference point; its site could not be read in this session.

**Cost.** Tier A model cost is negligible, a few dollars for the whole pack; the reviewer's fee is the real cost and was not priced. Tier B about US$0.02 a message with back-translation; about US$130 a year at 6,000 messages.

**Attaches at.** `src/domain/jurisdictions/types.ts` and `nz.ts` (a translation field with its own verification stamp), `src/domain/triage.ts`, `src/screens/pool/repairs/ReportFlow.tsx`, the Pool shell. **Backend: tier A no; tier B yes.**

### 5.5 A second reader on repair reports

**The job.** `src/domain/triage.ts` sorts a report by keywords, on purpose: the same words always give the same answer and anything that sounds dangerous is sorted upwards. Its blind spot is a danger described in words it does not know ("the wall socket is warm and smells fishy"). A model can read the description, and a photo, as a second pair of eyes.

**Evidence and failure rate.** Section 2.5. No measurement for this task. The nearest study found models chose the right course of action 56.3% of the time on their own. That is not good enough to sort reports and may be good enough to catch some that the rules under-sort, provided it can do no harm when wrong.

**Checked mechanically.**
- Output is `{ hazards[], suggestedIssue, urgencyAtLeast, because, ask }` with hazards and issue from the existing `HazardKey` and `IssueKey` lists.
- **Final urgency is the higher of the rule's and the model's. The model cannot lower it.** A wrong model costs an unnecessary look by a person, never a missed emergency that the rules would have caught.
- `because` must be an exact quote from the renter's description, so the landlord sees the words that raised it.
- `ask` is one question from a closed list, shown to the renter before sending.
- If the call fails, the rules stand and nothing on screen changes.

**A person approves.** Any report the second reader raised is marked as such for the landlord. Stop-and-call safety guidance is static and shown before any model is involved.

**The screen must show.** "Sorted by the rules as routine. A second reader raised it to urgent because you wrote: ...". To the renter as well as the landlord, in the same words, which is what `ReportFlow.tsx` already promises.

**Never delegated.** A diagnosis. Who pays (`possibleTenantFault` stays a flag for a person). Telling a renter something is safe or can wait. Booking or cancelling a tradesperson.

**Privacy and law.** The description and photos come from inside someone's home. In Australia, from 10 December 2026, a privacy policy must describe decisions where a computer program does something substantially and directly related to a decision that could significantly affect a person. OAIC's guidance says this covers rule-based programs as well as AI, applies even where a person reviews the output, and gives a case-management system that automatically escalates certain complaints as an example. The keyword sorter may already be in scope for an Australian launch; adding a model does not change that.

**Cost.** About US$0.0006 a report on the smallest model with two photos; about US$4 a year at 8,000 reports.

**Attaches at.** `src/domain/triage.ts`, `src/domain/triage.test.ts` (the golden set belongs here), `src/screens/pool/repairs/ReportFlow.tsx`, `src/screens/loop/Repairs.tsx`. **Backend: yes.**

### 5.6 Inspection photo notes

**The job.** After a walk-through of eight rooms and thirty photos, the inspector writes notes. A model can offer a one-line neutral description per room to start the note, point at things that look different from the last inspection's photos of the same room, and warn when a photo seems to include a person, a screen or a document before it is kept.

**Evidence and failure rate.** Section 2.3. The weakest evidence of any use here, and no benchmark for the task. Competitors ship it (section 8) and publish no accuracy figures.

**Checked mechanically.** Less than any other use, because code cannot check a claim about a picture.
- Output per room is `{ description, lookAgain[], privacyWarnings[] }`. Each pointer names photo ids that were actually supplied. Flags come from the existing `ROOM_FLAGS` keys.
- A banned-word check on the output: no cause, no blame, no cost, no "tenant", no "damage" stated as a finding.
- The model never edits, crops or enhances a photo. The original and its hash at capture are the record.

**A person approves.** The inspector, in the room, where they can look. Suggestions arrive in `src/screens/loop/inspections/Studio.tsx` as items to accept or dismiss. The score from 1 to 5 is the inspector's alone.

**The screen must show.** Which notes began as a model's suggestion and were confirmed by the inspector, in the report the tenant receives. "Nothing pointed out" must not read as "nothing wrong".

**Never delegated.** The condition score. Damage against fair wear and tear. Cause. Liability. Any bond figure. Whether a photo is genuine (the vendor states the model cannot tell). Identifying anyone.

**Gate.** Do not ship without a test set built by the team: at least 200 pairs of room photos with known, seeded changes and known non-changes, scored for hits and false alarms, with the result published in the product. If the false-alarm rate makes inspectors stop reading the suggestions, the feature has failed whatever the hit rate.

**Privacy and law.** OPC's rental guidance says inspection photos should show no more than is needed to record how the home is being looked after, should not include people or dwell on personal belongings, and that tenants may ask to see them. The privacy warning is the part of this use that helps comply. Tenants must be told a model looks at inspection photos. OAIC notes many photographs carry sensitive information. The Tenancy Tribunal's guidelines list fake or altered images among AI's risks, which is why the model must never touch the originals.

**Cost.** With photos at the 1,600 px the app already stores, about 2,500 tokens each. A full comparison of 64 photos costs about US$0.40 on the mid model and US$0.80 on the larger one. About US$3,200 to US$6,400 a year at 8,000 inspections; half that through the batch interface if the suggestions can arrive after the visit, which defeats the point of confirming in the room.

**Attaches at.** `src/domain/inspections.ts`, `src/screens/loop/inspections/Studio.tsx`, `Report.tsx`, `src/data/photos.ts`. **Backend: yes.**

### 5.7 A summary for the Tribunal pack

**The job.** `src/screens/loop/tenancies/TribunalPack.tsx` already assembles the tenancy, the rent position, payments, events and notices in order, with redaction, entirely from records. A model could add a short neutral paragraph of what happened and tag which records bear on the claim.

**Evidence and failure rate.** Chronology was one of the few tasks where no tool beat lawyers (66.9 to 80.2 against 80.2). The Tribunal itself reports AI material that misstates timelines and that buries a simple claim in volume.

**How it would have to be built.** Each record becomes one citable block. Every sentence of the summary must carry a citation to a record; code drops any sentence without one and checks that each date and amount in a sentence appears in the record it cites. A hard cap of about 200 words. Redaction runs afterwards. The applicant reads it, edits it, and ticks that they checked it against their records. The pack keeps a line available stating that part of the summary was drafted with an AI tool and checked by the applicant, because the Tribunal's guidelines require disclosure when asked.

**Never delegated.** Witness statements; the guidelines say these should not be influenced or rewritten by an AI tool, and NCAT forbids generative AI for them outright. Legal argument, case citations, the chance of success, whether to settle. Anything said in a hearing or mediation: the guidelines say AI tools must not be used to record, transcribe, summarise or analyse them.

**Verdict.** The deterministic pack already does the valuable part. The model adds a paragraph to the highest-stakes document the product produces, for the audience least tolerant of error. Build it small and late, or not at all.

**Cost.** About US$0.30 a pack; negligible in total. **Attaches at** `TribunalPack.tsx`, `src/domain/rules/text.ts`. **Backend: yes.**

A related, safer use: a second reader for redaction that can only suggest *more* to remove from a pack, never less.

### 5.8 Already built: the law-change draft

`scripts/reg-watch.mjs` is the right pattern and needs no change of principle. Its inputs are public pages with no personal information, it runs in CI, and a person decides. Three notes:

- The README says this path has been written but not yet run against the live API. Run the replay evaluation described in `regulatory-watch-sources.md` 3.5 (the Act before and after 1 December 2025) before trusting a draft in review.
- The model id in the script, `claude-opus-5-5`, is current: US$4 and US$20 per million tokens in and out, checked today. Roughly US$0.14 per detected change at 15,000 tokens in and 4,000 out **(estimate)**.
- Record the model id and prompt version on each draft so a later change in behaviour can be traced.

### 5.9 Also considered, briefly

| Use | View |
|---|---|
| Suggesting a ledger category for a bank-feed line | Sound. Closed list, person confirms, counts kept. Rent matching itself stays arithmetic. |
| Listing copy from the home's record | Low risk if the model is given only recorded facts and code rejects any feature not in the record. Fair Trading Act s 13 covers false claims about a property's characteristics. |
| Voice notes turned into inspection notes | Not researched. |

## 6. Do not build

| Refuse | Why | Sources |
|---|---|---|
| **1. A free-form legal assistant**, including case-law search and "will I win" | Measured error rates in section 2.1 are far above what a landlord acting on the answer can bear, and the failures look like answers. The Tribunal's guidelines warn that AI may overstate a party's prospects. Giving legal advice about the direction or management of proceedings before a New Zealand court or tribunal is a reserved area of work; a non-lawyer who does it for gain commits an offence (Lawyers and Conveyancers Act 2006 ss 6, 24). A paid product that coaches a landlord through a Tribunal claim is close to that line. My reading, not legal advice | Section 2.1; Tribunal guidelines; https://www.legislation.govt.nz/act/public/2006/1/en/latest/ (as at 1 Oct 2026) |
| **2. Scoring, ranking or summarising applicants** | The Human Rights Act grounds and OPC's "never collect" list (`nz-tax-privacy-payments.md` 2.2, 2.5) make most of what a model would infer unlawful to use. OPC's AI guidance says the track record of AI tools for screening documents is not good. IPP 8 requires reasonable steps to ensure accuracy before use. In Australia this is the textbook case for the new automated-decision disclosure, and rental application platforms are already under regulator attention (`competitive-landscape.md`, 2Apply and Snug) | OPC AI guidance; OAIC APP Guidelines ch 1 |
| **3. Verdicts from photos**: cause, fault, wear and tear, bond amounts | Section 2.3: models answer from expectation, are weak at loss assessment, and cannot authenticate an image. The decision moves money between two people and ends up before the Tribunal | Section 2.3; vendor vision limits |
| 4. Rent-setting or "market rent" recommendations from pooled data | Legally fraught; see the RealPage settlement in `competitive-landscape.md` | repo research |
| 5. Anything that acts on its own: sending a notice, booking a trade, answering a phone, replying to a tenant | The NPR report shows the failure: a promise made and nobody behind it. A served notice cannot be edited. Prompt injection cannot be filtered out, only made harmless by removing the model's ability to act | Section 3; NPR |
| 6. Writing or polishing witness statements; recording or summarising hearings and mediations | The Tribunal's guidelines forbid the second and say the first must be the witness's own words | Tribunal guidelines |
| 7. Recognising faces, or inferring anything about a person from a photo | The Biometric Processing Privacy Code 2025 has been in force since 3 November 2025, with existing processing to comply by 3 August 2026. Nothing in this product needs it | https://www.privacy.org.nz/privacy-principles/codes-of-practice/biometric-processing-privacy-code-2025/ (page read; the rules themselves not read) |

A model must also never change a rule pack value without the Rulewatch review. That is already enforced and is listed here so it stays so.

## 7. Law and regulator guidance that constrains these uses

### 7.1 New Zealand

| Item | What it says | Source | Reading |
|---|---|---|---|
| Privacy Commissioner's expectations for agencies using AI | Eight: senior leadership approval; check the tool is necessary and proportionate; a privacy impact assessment before use; tell people how, when and why; engage with Māori; procedures for accuracy and for access by individuals; human review before acting on output; ensure personal information is not retained or disclosed by the tool | https://www.privacy.org.nz/assets/New-order/Resources-/Publications/Guidance-resources/AI-Guidance-Resources-/AI-and-the-Information-Privacy-Principles.pdf (Sept 2023); https://www.privacy.org.nz/resources-and-learning/a-z-topics/ai/generative-artificial-intelligence/ (15 June 2023) | read in full |
| Same guidance, on oversight | A human in the loop may not be enough because of automation blindness; decisions affecting people generally need human review that is empowered and resourced | same | read in full |
| Same guidance, a landlord example | A landlord using a text generator to write to tenants is an agency under the Act and should avoid putting personal information into the tool | same, p 7 | read in full |
| Same guidance, IPP 12 | Using an offshore provider to store or process is not an overseas disclosure so long as the provider does not use the information for its own purposes. You remain responsible | same, p 11 | read in full |
| Privacy Act 2020 s 11 | Information held by A on behalf of B is treated as held by B, wherever A is, unless A uses or discloses it for its own purposes | https://www.legislation.govt.nz/act/public/2020/31/en/latest/ (as at 8 Oct 2026) | read in full |
| IPP 8 | Do not use or disclose personal information without reasonable steps to ensure it is accurate, up to date, complete, relevant and not misleading | same | read in full |
| IPP 3A | In force 1 May 2026. When collecting about a person from someone else, take reasonable steps to make the person aware of the collection, its purpose, recipients, the agencies' names and addresses, and their rights. Not needed where the person was already told | same; https://www.privacy.org.nz/resources-and-learning/a-z-topics/ipp3a/ | read in full; page read |
| Rental guidance: inspection photos | No more than needed to show how the home is cared for; no people; do not dwell on belongings; tenants may ask for the photos; a cloud provider's breach is still yours to answer | https://www.privacy.org.nz/resources-and-learning/a-z-topics/rental-guidance-for-landlords/ | page read |
| Tenancy Tribunal: guidelines on AI, issued by the Principal Tenancy Adjudicator under RTA s 115 | AI may be used. The party is always responsible; "the AI made a mistake" is no excuse. Check content yourself, not with another AI tool. Wrong material can cost credibility, cause delay, strike-out, or costs where the proceedings were frivolous or vexatious. Volume itself is a fault. Do not use AI to record, transcribe, summarise or analyse hearings or mediations. Witness statements must be the witness's own. Think before uploading tenancy agreements, photos or another person's details to an AI tool. Disclose AI use if asked | https://www.justice.govt.nz/assets/Documents/Publications/Guidance-to-Tribunal-users-on-the-use-of-AI.pdf (undated; the repo's earlier research places it in 2026) | read in full |
| Tenancy Services' applicant-facing summary | AI may be used to prepare an application; false cases or principles can weaken a case, cause delay or dismissal; the applicant is responsible for accuracy | https://www.tenancy.govt.nz/disputes/tribunal/completing-an-application-to-the-tenancy-tribunal/ (updated 10 Nov 2026) | page read |
| Courts' guideline for non-lawyers | Chatbots are not a substitute for a lawyer; appear to have limited training on NZ law; may invent cases and confirm false information when asked; do not enter private information; no need to disclose use unless asked. Applies to the Tenancy Tribunal | https://www.courtsofnz.govt.nz/assets/6-Going-to-Court/practice-directions/practice-guidelines/all-benches/20231207-GenAI-Guidelines-Non-Lawyers.pdf (7 Dec 2023) | read in full |
| Fair Trading Act 1986 s 9 | No misleading or deceptive conduct in trade | https://www.legislation.govt.nz/act/public/1986/121/en/latest/ (as at 1 July 2026) | read in full |
| s 11 | No conduct liable to mislead the public about the nature, characteristics or suitability for a purpose of services | same | read in full |
| s 12A | No unsubstantiated representations: a claim made without reasonable grounds at the time, whether or not it turns out true | same | read in full |
| s 13 | No false or misleading representation that services are of a particular standard or quality, or supplied by a person of a particular qualification or skill | same | read in full |
| Consumer Guarantees Act 1993 ss 28, 29 | Services to a consumer carry guarantees of reasonable care and skill and of fitness for a purpose the consumer made known | https://www.legislation.govt.nz/act/public/1993/91/en/latest/ (as at 24 Jan 2026) | read in full. **[U]** whether and how the Act applies to a landlord using the product in trade, and contracting out, was not checked |
| Lawyers and Conveyancers Act 2006 s 6 | Reserved areas of work include giving legal advice to another person about the direction or management of proceedings before a NZ court or tribunal that they are considering, have decided to bring, or are party to | https://www.legislation.govt.nz/act/public/2006/1/en/latest/ (as at 1 Oct 2026) | read in full |
| s 24 | A non-lawyer who does that work for gain commits an offence | same | read in full |
| s 22(3) | An offence to use words likely to make someone believe a person has a qualification in law or special expertise in a branch of the law when they do not | same | read in full |

For the four Acts in this table, "read in full" means the section named was read in full from the Act's XML. The rest of each Act was not read.

Three consequences for the product, each to be confirmed with counsel:

- **"Instant expert" is a representation.** Under s 12A it needs reasonable grounds when made. The golden sets in section 4 are the substantiation file. Keep the results.
- **The assistant must not look like a lawyer.** No persona, title or wording that suggests legal qualification or special expertise in tenancy law (s 22(3)). "Answers from the verified rule pack, with sources" is accurate and enough.
- **General information about the Act is one thing; advice on running a particular Tribunal case is another.** Keep the product on the first side: what the Act says, what the dates are, what the records show.

### 7.2 Australia

| Item | What it says | Source | Reading |
|---|---|---|---|
| OAIC guidance on commercially available AI products (21 Oct 2024) | Privacy obligations apply to personal information put into an AI system and to output about a person, including wrong output. Do due diligence on the product, including how human oversight is built in. Update privacy policies and notices; identify public-facing AI tools as such. Generating or inferring personal information is a collection under APP 3. APP 6 limits use to the purpose of collection. As best practice, do not enter personal information into publicly available generative tools. Under APP 10, take reasonable steps on accuracy, including disclaimers about limits | https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products | section read |
| Same guidance, use against disclosure | Where information stays within the organisation's control in a proprietary system with protections against the developer accessing it, entering it is a use. Where it is released from the organisation's effective control, it is a disclosure and APP 8 on cross-border disclosure also arises | same | read in full |
| APP 1.7 to 1.9, automated decisions | **From 10 December 2026**, a privacy policy must say what kinds of personal information are used, and what kinds of decisions are made, where the entity has arranged for a computer program to make, or do something substantially and directly related to making, a decision that could reasonably be expected to significantly affect a person's rights or interests. "Computer program" includes pre-programmed rule-based processes as well as AI. In scope even where a person reviews the output. Examples given include a system that automatically escalates certain complaints | https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-1-app-1-open-and-transparent-management-of-personal-information | section read |
| Who the Privacy Act covers in tenancy | Organisations with annual turnover above A$3 million and some others, which may include real estate agents; operators of residential tenancy databases regardless of turnover | https://www.oaic.gov.au/privacy/your-privacy-rights/more-privacy-rights/tenancy | read in full |
| NCAT Procedural Direction 7 (commenced 7 April 2025) | Generative AI must not be used to produce statements, affidavits, character references or other evidence, or to alter or strengthen a witness's evidence. It may be used for chronologies, indexes, summarising documents and preparing submissions. Where used for submissions, the party must verify in the body of the submissions that every citation exists, is accurate and is relevant, and not by AI alone. Tools that merely translate, transcribe or correct spelling are outside the direction | https://www.dcj.nsw.gov.au/content/dam/dcj/ctsd/ncat/documents/procedural-directions/ncat-pd7-use-of-generative-ai.pdf | read in full |
| Queensland, Victoria and other tribunals | Not read. The Queensland Courts guideline for non-lawyers returned an error | - | **[U]** |
| Australian Consumer Law s 18 (misleading conduct) | The Australian counterpart of Fair Trading Act s 9; not re-read in this session | - | **[U]** |
| Further privacy reforms (removal of the small business exemption, a fair and reasonable test) | Status in late 2026 not established; the Attorney-General's page timed out | - | **[U]** |

For an Australian launch the practical point is the date. The automated-decision disclosure starts on 10 December 2026, covers the existing keyword triage as much as any model, and belongs in the Australian packs' upcoming changes.

### 7.3 A company's responsibility for what its assistant says

**[U]** *Moffatt v Air Canada*, 2024 BCCRT 149, is the usual reference: a Canadian tribunal held an airline responsible for a wrong statement made by its website chatbot. The decision could not be opened in this session and is cited from memory. It is not New Zealand or Australian authority. The Fair Trading Act sections above make the same point without it: what the product says in trade is the business's conduct.

## 8. What property software ships in 2026, and how it describes the limits

Vendor pages read on 14 November 2026. Everything in the middle column is a vendor's own description.

| Product | What it says it does with AI | What it says about limits |
|---|---|---|
| Buildium (Lumina AI) https://www.buildium.com/features/ai-property-management-software/ | Reads invoices into bills; an assistant; message and notice drafting; summaries; agents for maintenance, leasing, accounting | Sensitive decisions always need human review; users stay in control; a settings page to choose features. An 83% time saving on review is labelled an estimate with no method. Nothing on fair housing, data use or accuracy |
| PropertyMe (AiMe) https://www.propertyme.com.au/aime | Drafts email replies that state tenancy legislation; state-tailored compliance guidance; reads supplier invoices | For invoices, the user checks the result before it is saved and financial decisions stay with the property manager. For compliance guidance and replies: no limits, no disclaimer, no sources, no model provider named. Describes itself as an AI that is actually correct, with no evidence offered |
| AppFolio (Realm-X) https://www.appfolio.com/ai | An assistant that plans and carries out tasks; flows that run procedures automatically; "Performers" that act independently, including after hours | General principles on fairness, reliability and privacy. No statement of which actions need approval, no limits, no figures |
| TurboTenant https://www.turbotenant.com/product-updates/introducing-maintenance-ai/ (3 Dec 2025) | Collects details and photos from the tenant, walks them through basic fixes, summarises for the landlord | No approval step described, no handling of emergencies described, no disclaimers |
| Keyhook https://www.keyhook.com | Invoice extraction and matching; payment matching; AI maintenance and inspections | Invoices are shown ready for approval; owner approval in maintenance. No disclaimers, accuracy or sources. The "Tama" law assistant in the repo's earlier research is not mentioned on the page |
| RentCheck https://www.getrentcheck.com/ | AI damage detection to help make sure critical issues are not missed and to prioritise which inspections to review | A person reviews inspections. No accuracy figure, no limits, nothing on disputes |
| Tapi https://tapihq.com/ | An AI-first maintenance workbench; a chat that guides tenants through logging an issue | Nothing on limits, approval, accuracy, emergencies or data |

Three observations.

- **Nobody publishes an accuracy figure.** Not one page read gives an error rate, a test, or a method. The repo's earlier landscape review found the same.
- **The limits that are stated cluster around money**: a person checks an invoice before it is saved. The riskiest features, compliance guidance and drafted replies that state the law, carry the fewest caveats.
- **The one independent account found is a failure of follow-through, not of language** (NPR, section 2.5): the bot said the right thing and nothing happened.

This product's stance is already the stricter one. The opening for it is to be the one that shows its test results and its working.

## 9. Cost

### 9.1 Published prices and line-up, checked 14 November 2026

From https://platform.claude.com/docs/en/about-claude/pricing and https://platform.claude.com/docs/en/about-claude/models/overview (page read). US dollars per million tokens.

| Model | Id | Input | Output | Cache read | Note |
|---|---|---|---|---|---|
| Claude Fable 5.2 | `claude-fable-5-2` | $8 | $40 | $0.20 | Most capable. Requires 30-day retention of prompts and outputs |
| Claude Opus 5.5 | `claude-opus-5-5` | $4 | $20 | $0.20 | The vendor's suggested starting point; used by `scripts/reg-watch.mjs` |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2 | $10 | $0.10 | |
| Claude Haiku 5.5 | `claude-haiku-5-5` | $0.10 | $0.50 | $0.01 | For prompts up to 100,000 tokens; $0.50 and $2.50 above that. Described as for classification, extraction and routing |

- All four take images. All have a 1 million token context window.
- **Batch interface: 50% off** input and output, for work that can wait.
- **Images:** a photo costs ⌈width ÷ 28⌉ × ⌈height ÷ 28⌉ tokens, up to 4,784 on current models. The app's 1,600 px photos are about 2,494 tokens each (https://platform.claude.com/docs/en/build-with-claude/vision).
- **PDFs:** 1,500 to 3,000 text tokens a page, plus image tokens for each page (https://platform.claude.com/docs/en/build-with-claude/pdf-support).
- **US-only processing:** 1.1 times the price. The only choices are "global" and "us". Data at rest is stored in the US. **There is no New Zealand or Australian option on the vendor's own API** (https://platform.claude.com/docs/en/manage-claude/data-residency). **[U]** regional hosting through a cloud provider was not checked.
- **Data handling** (https://platform.claude.com/docs/en/manage-claude/api-and-data-retention): retained data is not used for training without express permission. Prompts and outputs are not retained by default, except on Fable and Mythos models, which require 30 days. Content flagged by the vendor's safety systems may be kept for up to two years. An organisation on zero data retention cannot call the API from a browser.
- The current tokenizer produces about 30% more tokens for the same text than the previous one.

### 9.2 Estimates at 1,000 landlords

Assumptions, all mine and none measured: two homes per landlord, so 2,000 tenancies; output figures include an allowance for the model's reasoning, which is billed as output; token counts are round guesses and could be out by a factor of two either way. Measure with the token-counting endpoint before budgeting.

| Use | Model assumed | Tokens in / out per use | Per use | Uses a year | A year |
|---|---|---|---|---|---|
| Question routing | Haiku 5.5 | 1,500 / 150 | $0.0002 | 78,000 | $18 |
| Agreement reading (text) | Sonnet 5.5 | 31,500 / 2,700 | $0.09 | 2,600 | $234 |
| Invoice reading | Sonnet 5.5 | 5,500 / 600 | $0.017 | 30,000 | $510 |
| Message drafts | Sonnet 5.5 | 2,000 / 800 | $0.012 | 24,000 | $288 |
| Message translation with back-translation | Sonnet 5.5 | 2,600 / 1,600 | $0.021 | 6,000 | $127 |
| Repair second reader, two photos | Haiku 5.5 | 4,000 / 300 | $0.0006 | 8,000 | $4 |
| Inspection photo notes, 64 photos | Sonnet 5.5 | 161,000 / 8,000 | $0.40 | 8,000 | $3,218 |
| Tribunal summary | Opus 5.5 | 40,000 / 7,000 | $0.30 | 60 | $18 |
| Law-change draft (exists) | Opus 5.5 | 15,000 / 4,000 | $0.14 | 100 | $14 |
| **Total** | | | | | **about $4,430** |
| Total without inspection photos | | | | | about $1,210 |

- That is about US$4.40 per landlord per year, or US$1.20 without photos.
- Inspection photo notes on Opus 5.5 would be about US$0.80 a visit and US$6,400 a year.
- Invoice reading on Haiku 5.5 would be about US$26 a year instead of US$510. Which model each use needs is a question for the golden set, not for this table: use the cheapest one that passes.
- **Not priced:** the server, the reviewers' time, translators' fees, and building the test sets. These will be the real cost.

## 10. Unverified, and not read

- **No web search.** Coverage of 2026 research and regulator output is whatever could be reached by known address.
- **Figures from fetched pages were extracted by a small model** and not cross-checked. The benchmark figures in section 2 and the vendor prices in section 9 should be opened and confirmed before they are quoted outside this document.
- **arXiv papers were read as abstracts only.**
- **Not read (blocked or failed):** MBIE's Responsible AI Guidance for Businesses; *Moffatt v Air Canada*; the Queensland Courts guideline; the Attorney-General's page on Australian privacy reform; Te Hiku Media's Papa Reo; the Royal Society paper on over-generalisation in model summaries (no figure from it is used here).
- **Not established:** the date of the Tenancy Tribunal's AI guidelines; the seven New Zealand cases in the hallucination database, including whether any is a Tenancy Tribunal matter; the rules inside the Biometric Processing Privacy Code; whether the Consumer Guarantees Act applies to a landlord customer; the Australian Consumer Law text; how IPP 3A treats a platform reading a document its customer uploaded; the 2025 machine translation shared-task findings; regional hosting options through cloud providers.
- **Dahl et al.'s 58% to 88%** is carried from the repo's earlier document. The Stanford summary page read today gives 58% to 82% for the same earlier study. One of the two is misquoted; check the paper.
- **Every cost is an estimate** built on assumed volumes and token counts.
- **Legal readings in sections 6 and 7 are a researcher's, not a lawyer's.**

## 11. Sources actually opened

Regulators, courts and legislation
- Principal Tenancy Adjudicator, Guidelines on the use of AI in Tenancy Tribunal matters: https://www.justice.govt.nz/assets/Documents/Publications/Guidance-to-Tribunal-users-on-the-use-of-AI.pdf
- Tenancy Tribunal practice page: https://www.justice.govt.nz/tribunals/tenancy/practice/
- Tenancy Services, completing an application: https://www.tenancy.govt.nz/disputes/tribunal/completing-an-application-to-the-tenancy-tribunal/
- Tenancy Services, translated resources: https://www.tenancy.govt.nz/about-tenancy-services/translated-resources/
- Courts of New Zealand, generative AI guidelines: https://www.courtsofnz.govt.nz/going-to-court/practice-directions/practice-guidelines/all-benches/guidelines-for-use-of-generative-artificial-intelligence-in-courts-and-tribunals/ and the non-lawyers PDF linked there
- Privacy Commissioner, AI and the IPPs: https://www.privacy.org.nz/resources-and-learning/a-z-topics/ai/ and the PDF linked there; generative AI expectations: https://www.privacy.org.nz/resources-and-learning/a-z-topics/ai/generative-artificial-intelligence/
- Privacy Commissioner, IPP 3A: https://www.privacy.org.nz/resources-and-learning/a-z-topics/ipp3a/
- Privacy Commissioner, sending information overseas: https://www.privacy.org.nz/responsibilities/disclosing-personal-information-outside-new-zealand/
- Privacy Commissioner, rental guidance for landlords: https://www.privacy.org.nz/resources-and-learning/a-z-topics/rental-guidance-for-landlords/
- Privacy Commissioner, Biometric Processing Privacy Code 2025: https://www.privacy.org.nz/privacy-principles/codes-of-practice/biometric-processing-privacy-code-2025/
- Privacy Act 2020, Fair Trading Act 1986, Consumer Guarantees Act 1993, Lawyers and Conveyancers Act 2006, as XML from https://www.legislation.govt.nz/
- OAIC, commercially available AI products: https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products
- OAIC, APP Guidelines chapter 1: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-1-app-1-open-and-transparent-management-of-personal-information
- OAIC, tenancy: https://www.oaic.gov.au/privacy/your-privacy-rights/more-privacy-rights/tenancy
- NCAT Procedural Direction 7: https://www.dcj.nsw.gov.au/content/dam/dcj/ctsd/ncat/documents/procedural-directions/ncat-pd7-use-of-generative-ai.pdf
- UK National Cyber Security Centre: https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection
- OWASP: https://genai.owasp.org/llmrisk/llm01-prompt-injection/

Research and benchmarks
- https://arxiv.org/abs/2405.20362 , https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-or-more-benchmarking-queries
- https://www.vals.ai/vlair , https://www.vals.ai/industry-reports/vlair-10-14-25 , https://www.vals.ai/benchmarks , https://www.vals.ai/benchmarks/legal_research , https://www.vals.ai/benchmarks/a2j , https://www.vals.ai/benchmarks/mortgage_tax , https://www.vals.ai/benchmarks/corp_fin_v2
- https://arxiv.org/abs/2408.10343 , https://arxiv.org/abs/2412.07626 , https://arxiv.org/abs/2406.09411 , https://arxiv.org/abs/2407.16837 , https://arxiv.org/abs/2407.06581 , https://arxiv.org/abs/2505.23941 , https://arxiv.org/abs/2404.09690 , https://arxiv.org/abs/2504.18919 , https://arxiv.org/abs/2309.07423 , https://arxiv.org/abs/2404.13813 , https://arxiv.org/abs/2407.18418 , https://arxiv.org/abs/2506.08837 , https://arxiv.org/abs/2510.09023
- https://github.com/vectara/hallucination-leaderboard
- https://github.com/facebookresearch/flores/blob/main/flores200/README.md
- https://aclanthology.org/2024.wmt-1.1/
- https://www.ebu.ch/research/open/report/news-integrity-in-ai-assistants
- https://www.damiencharlotin.com/hallucinations/
- https://idp-leaderboard.org/ (vendor-run and undated; not relied on)

Model vendor documentation
- https://platform.claude.com/docs/en/about-claude/pricing , https://platform.claude.com/docs/en/about-claude/models/overview , https://platform.claude.com/docs/en/build-with-claude/vision , https://platform.claude.com/docs/en/build-with-claude/pdf-support , https://platform.claude.com/docs/en/build-with-claude/citations , https://platform.claude.com/docs/en/build-with-claude/structured-outputs , https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations , https://platform.claude.com/docs/en/test-and-evaluate/develop-tests , https://platform.claude.com/docs/en/manage-claude/api-and-data-retention , https://platform.claude.com/docs/en/manage-claude/data-residency

Property software and press
- https://www.buildium.com/features/ai-property-management-software/ , https://www.propertyme.com.au/aime , https://www.appfolio.com/ai , https://www.turbotenant.com/product-updates/introducing-maintenance-ai/ , https://www.keyhook.com , https://www.getrentcheck.com/ , https://tapihq.com/ , https://ailo.io/ (no AI detail on the page read)
- https://www.wamc.org/2026-09-28/chatbots-are-becoming-a-new-reality-for-renters

## 12. Ranked table

| Rank | Use | User value | Trust risk once built as specified | Effort | Needs a backend |
|---|---|---|---|---|---|
| 1 | Understanding the question (5.1) | High: the assistant stops saying "I don't know" to questions it can answer | Low to medium: a wrong route gives a true answer to the wrong question, visible on screen | Medium | Yes |
| 2 | Reading agreements and invoices (5.2) | High: setup in minutes; a ledger that fills itself | Medium: a wrong field a person waves through | Medium | Yes |
| 3 | Drafting messages from facts (5.3) | Medium to high: the confidence a first-time landlord lacks | Low to medium: tone, never facts | Small to medium | Yes |
| 4 | Translating fixed content, human-reviewed (5.4 tier A) | Medium to high for renters | Low after review; stale translations are hidden | Medium, mostly reviewers' time | **No** |
| 5 | Second reader on repair reports (5.5) | Medium | Low: it can only raise | Small | Yes |
| 6 | Inspection photo notes and privacy warning (5.6) | Medium to high, and expected by the market | High: weakest evidence, disputed money, no mechanical check | Large, including the test set | Yes |
| 7 | Courtesy translation of messages (5.4 tier B) | Medium | Medium for Mandarin and Hindi; high for te reo Māori, Samoan, Tongan | Medium | Yes |
| 8 | Tribunal pack summary (5.7) | Low to medium | High | Medium | Yes |
| - | Law-change draft (5.8) | Medium, for the team | Low, already guarded | Done | **No** (CI) |
| - | Ledger category suggestions (5.9) | Medium | Low | Small | Yes |
| Refuse | Free-form legal assistant; applicant scoring; verdicts from photos; rent-setting; anything that acts alone; witness statements and hearing summaries; face recognition | - | Unacceptable | - | - |
