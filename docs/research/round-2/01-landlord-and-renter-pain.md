# Round 2 · 01: What landlords and renters still struggle with

Research date: 14 November 2026. Every source below was opened and read on that date unless marked otherwise.

## How to read this

- **Unverified** means the point was not confirmed at a primary source today. Do not build on it without checking.
- **Secondary** means a news article reporting someone else's figures; the original was not read.
- "Today in the product" was checked against the source in `src/`, not against the spec.
- Reddit posts are paraphrased, never quoted, and no usernames are recorded. They show what people ask about, not how common a problem is: people post when something has gone wrong.

### Limits of this round

The session's web-search budget (shared across the research agents) was already spent when this work began, so **no web searches were run**. Everything here was reached by fetching known addresses and following index pages. What that cost:

| Wanted | What happened |
|---|---|
| Reddit r/PersonalFinanceNZ, r/newzealand, r/auckland, r/Wellington, r/chch | Reddit's JSON endpoints returned 403 and its feeds rate-limit hard. Read instead: the public listing feeds of **r/LegalAdviceNZ** (497 top posts of the last 12 months, plus the 400 newest, 16 Sep to 13 Nov 2026) and the top 300 of r/PersonalFinanceNZ for the year, filtered locally for renting topics. r/PersonalFinanceNZ's top posts are almost all about savings and KiwiSaver; three were about renting out rooms. The four city and national subreddits were **not read**. Comment threads were not read, only the posts. |
| PropertyTalk | HTTP 403. Not read. |
| NZ Property Investors' Federation | News page loads empty. Not read. Auckland Property Investors Association session listings were read instead (titles and descriptions only; the videos are members-only). |
| App-store and Google reviews (myRent, Renti, RentHQ, Palace, Re-Leased, TPS) | Could not be located without search. Trustpilot pages for Renti and Tenancy.co.nz returned 404. myRent's Trustpilot page was re-read and matches round one. PropertyMe's Trustpilot page (Australia) was read. |
| Citizens Advice Bureau | Site renders by script; nothing readable came back. |
| Consumer NZ | Only the 2022 mystery-shop article was reachable (already in round one). |
| Tony Alexander investor survey, July 2026 | Page renders by script. Its headline figure is cited second-hand from The Conversation. |
| Stats NZ or MBIE data on who self-manages | Nothing newer than the HUD figure in round one was found. |

---

## Summary

Round one found that landlords break rules they did not know and that arrears and bonds drive most disputes; the product now handles the start and the middle of a tenancy well. This round's evidence says the unsolved pain sits at **the end of a tenancy and after a dispute**, and on **the renter's side of each clock**. Bond refunds are in 41% of Tribunal applications and were the most frequent renting topic in a month of r/LegalAdviceNZ posts (my count), yet the product stops at "the final inspection and bond refund come next". Water and other outgoings are in 17% of applications and the product has no way to pass a bill on. One in six tenant applications asks to cut a fixed term short, and there is no leaving-early flow. Renters who have a legal lever mostly do not know it exists (35% had never heard of a 14-day notice; of those who used one, 57% said it worked), and Pool gives them fault reporting but no notice, no clock and no statement of rent. People who win at the Tribunal then cannot collect. Three assumptions in the product are most clearly contradicted by 2025–26 evidence: that a rent review means an increase, that a landlord is a neutral verifier of a renter's record, and that no-cause termination is a stable ground (Labour has pledged to ban it and the 7 November election is undecided).

---

## Evidence base

| Ref | Source | Date | What it is |
|---|---|---|---|
| TS-STATS | https://www.tenancy.govt.nz/about-tenancy-services/data-and-statistics/ | Quarter 1 Jul to 30 Sep 2026 | Tenancy Tribunal applications by dispute type. 6,614 landlord and 1,365 tenant applications |
| RU-2026 | https://rentersunited.org.nz/wp-content/uploads/They-Havent-Updated-Anything-But-the-Rent-Aotearoa-Renters-Survey-Report-2026.pdf | 2026 (no date printed; reported by Waatea News on 17 Aug 2026, https://waateanews.com/?p=166507) | Renters United and ActionStation survey, 3,310 renters. Full 60-page report read. Respondents chose to take part, so it is not a representative sample; 51.1% of its private renters rent through a property manager |
| LANZ | https://www.reddit.com/r/LegalAdviceNZ/ listing feeds | Posts from Nov 2025 to 13 Nov 2026 | 497 top-of-year posts and the 400 newest (back to 16 Sep 2026). In the 200 newest (15 Oct to 13 Nov 2026) about 33 concerned renting or flatting, roughly one in six, and roughly a quarter of those were about bond deductions at move-out. Counts are mine, from titles and opening lines, and are approximate |
| TS-NEWS | https://www.tenancy.govt.nz/about-tenancy-services/news/ | Items from Nov 2025 to Oct 2026 | The regulator's own notices. What it chooses to explain shows where people go wrong |
| TS-GUIDE | Tenancy Services guidance pages, linked in each section | Read 14 Nov 2026 | The rules each proposed feature would rest on |
| HERALD | https://www.nzherald.co.nz/topic/tenancy-tribunal/ and five articles | Aug to Nov 2026 | Court reporting and two data stories |
| RNZ, Spinoff, Trade Me, The Conversation | linked in each section | Jul 2025 to Nov 2026 | Market direction and policy |
| TP-PME | https://www.trustpilot.com/review/propertyme.com.au | Reviews Dec 2023 to Nov 2026 | Australian comparison: 1.8 from 31 reviews |

---

## Pain points

### 1. The bond at the end: deductions nobody can justify

**What people say.** Renters describe move-out claims they cannot test: $350 for a benchtop chip they never saw, over $700 for a professional clean after they cleaned, 75% of $800 for one curtain in a new build, $3,000 held over a mark on four-year-old wallpaper, mould-damaged curtains billed at replacement cost with no allowance for age, a bond held back for repairs the landlord did during the tenancy. Several say the manager will not release anything until they accept every line. One landlord never inspected in four years and then expected the flat handed back as new. In the survey, bond disputes were the most common reason renters gave for having been to the Tribunal.

**Who has it.** Both sides. "Refund bond" is in 3,268 of 7,979 applications in the quarter (40.96%): 2,648 landlord applications and 620 tenant applications (45.42% of all tenant applications).

**Sources.**
- TS-STATS, quarter to 30 Sep 2026.
- RU-2026, p. 40.
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1rvuecd/property_manager_is_trying_to_claim_350_for_a/ (17 Mar 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1rg05w5/can_property_managers_really_just_do_this/ (27 Feb 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1xsawxm/property_manager_reckons_800_for_1_curtain_plus/ (10 Nov 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1xj928n/tenant_bond_issue/ (30 Oct 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1vtdwb9/who_pays_for_moulddamaged_curtains_in_a_rental/ (20 Aug 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1vplyw1/landlord_wont_return_bond_because_of_repairs_hes/ (16 Aug 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1s82hmg/nitpicky_landlords/ (30 Mar 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1wry9v1/our_property_manager_is_holding_up_the_bond/ (27 Sep 2026).
- Tenancy Services says the final report should be agreed by both and that tenants should check the amount before confirming: https://www.tenancy.govt.nz/rent-bond-and-bills/bond/preventing-problems-with-bonds/ (read 14 Nov 2026).

**Today in the product.** Inspections have an `exit` type and the studio records rooms and photos. The careless-damage cap is worked out and shown. The clause scanner blocks a professional-cleaning clause. But there is no settlement step: `EndTenancy.tsx` ends with "The final inspection and bond refund come next", and nothing compares the exit against the entry report, itemises a claim, allows for age, or lets the renter answer.

**Build.** A **bond settlement** screen, one per ended tenancy, shared by both doors.
- Each room shows the entry photo beside the exit photo. A deduction can only be raised against a room where the two differ.
- Each line needs a kind (rent owing, damage, cleaning, other), an invoice or quote, and for damage the item's age, so the claim is for remaining value and not for new. The age rule needs a sourced entry in the rule pack before it ships; none was verified today (**unverified**).
- The careless-damage cap already in `rules/tenancy.ts` applies per line.
- The renter sees every line in Pool and answers each one: agree, or disagree with a reason and their own photo. Agreed lines become the figure the landlord enters in Bond Hub. Disputed lines go into the Tribunal pack with both sides' evidence.
- A refusal where it belongs: a cleaning line with no exit photo, or a claim for an item with no entry record, is refused with the reason.

---

### 2. Bond records that do not match reality

**What people say.** A renter applied for a refund and Tenancy Services could not find the bond; they realised they had never had a lodgement email. Another's bond was "transferred" between an agency and the owner and neither would pay it out. Four flatmates paid different amounts ($160 to $1,410) and the manager lodged them as equal shares of $900, so the one who paid $1,410 is on record with $900. A renter was told months later that a bond top-up had been due with a rent increase nobody mentioned. Another got a lodgement email for a pet bond 63 days after paying it, the day after giving notice.

**Who has it.** Renters first, then the landlord who has to untangle it. "Bond not lodged" is in 144 tenant applications in the quarter (10.55%).

**Sources.**
- TS-STATS.
- All bond tasks are online only from 29 June 2026; paper forms are no longer accepted: https://www.tenancy.govt.nz/about-tenancy-services/news/faster-simpler-bond-management-is-now-live/ (29 Jun 2026).
- A landlord needs an 8-digit ID starting "LNL-"; one who has not received it is told to make contact at least four weeks before needing a bond transaction: https://www.tenancy.govt.nz/about-tenancy-services/news/we-are-sending-landlord-ids-to-some-landlords/ (29 Sep 2026).
- Tenants get a tenant number and need it to accept a refund: https://www.tenancy.govt.nz/about-tenancy-services/news/tenants-what-to-expect-if-your-property-manager-uses-software-for-bonds/ (7 Apr 2026).
- A tenant should chase if no lodgement notice arrives within 6 weeks; bond details must be updated within 10 working days of a change of landlord, manager or tenant: https://www.tenancy.govt.nz/rent-bond-and-bills/bond/preventing-problems-with-bonds/.
- A top-up asked for with a rent increase is lodged through Bond Hub within 23 working days: https://www.tenancy.govt.nz/rent-bond-and-bills/rent/increasing-rent/.
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1uwxx8e/tenancy_services_unable_to_locate_bond/ (15 Jul 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1w0lbdx/rental_agency_cannot_locate_bond/ (28 Aug 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1xuxjl0/huge_bonds_mess_up_by_property_management/ (13 Nov 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1ryiish/bond_top_up_overdue_but_i_was_never_informed/ (20 Mar 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1wvolfj/bond_lodged_after_63_days/ (2 Oct 2026).

**Today in the product.** A lodgement countdown, a field for the Bond Hub reference, and a self-healing check for "lodged with no reference". No Landlord ID, no tenant numbers, no per-tenant shares, no top-up task, and a change of tenant does not prompt a bond update.

**Build.** Small additions to the bond record.
- Hold the landlord's LNL- ID. If it is missing, say so on day one, because the regulator's own lead time is four weeks.
- Record what each tenant actually paid and show the split that will be lodged before it is lodged.
- Ask the renter in Pool, "Have you had the confirmation from Tenancy Services?" If not by six weeks, raise it on both sides.
- When a rent increase is served, ask whether a top-up is wanted; if yes, tell the renter the amount and date in the same notice and start the 23-working-day clock.
- A change-of-tenant variation opens a "update the bond" task with the 10-working-day date.

---

### 3. Arrears nobody can point to

**What people say.** A head tenant of four years was threatened over arrears the agency would not point to; they sent bank records and asked the tenants to find the gap. A sole tenant facing a Tribunal application had already disproved one $410 claim. A renter at move-out could not get a straight answer on whether two weeks paid in advance meant they had overpaid. The Australian reviews say the same thing more bluntly: rent paid on time, shown as late because of processing delay, followed by an arrears notice.

**Who has it.** Renters, and landlords, who are told to bring rent records from the start of the tenancy to any arrears claim. Rent arrears are in 4,580 applications in the quarter (57.40%).

**Sources.**
- TS-STATS.
- A landlord must give a written statement of rent for whatever period the tenant asks for in writing: https://www.tenancy.govt.nz/rent-bond-and-bills/rent/receipts-and-records/ (read 14 Nov 2026).
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1w5mdg8/landlord_is_threatening_to_kick_us_out_over/ (2 Sep 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1vra6yu/landlord_taking_me_to_tenancy_tribunal/ (18 Aug 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1xv52a1/rent_in_advance/ (13 Nov 2026).
- TP-PME: tenant reviews of 5 Nov 2026, 23 Jan 2026, 27 Dec 2024 and 4 Feb 2024 each describe on-time rent recorded as arrears.
- A payment delayed by an MSD administrative error led to an eviction notice with six hours to leave; the Tribunal awarded $4,628 (company landlord): https://www.nzherald.co.nz/nz/tenant-given-six-hours-to-move-out-over-delayed-msd-rent-tribunal-orders-compensation/TKQRZ3ZPHNETHML7TZYWSY5VKE/ (24 Oct 2026).

**Today in the product.** Loop has the ledger and reconciliation. Pool answers "am I square?" with a paid-to date and twelve on-time ticks (`RentHero.tsx`). The renter cannot see the periods, cannot download a statement, and cannot say "this line is wrong" about rent (that exists only for the Passport).

**Build.** A **rent statement both sides read from the same rows.**
- In Pool: every period, what was due, what landed, on what date, with what reference, and the running paid-to date. Downloadable for any date range, which is the statement the renter is entitled to ask for.
- "This is wrong" on any line, with the renter's bank record attached; it opens a task for the landlord and freezes any arrears notice built on that line until answered.
- An arrears notice in Loop names the specific unpaid periods. If the ledger cannot name them, the notice is refused with that reason.
- A move-out figure: rent to the last day, less what is paid ahead, worked out and shown to both.
- A flag on a tenancy whose rent arrives from Work and Income, so a payment that is late at source is described as that and not as a missed week. How those payments appear in a bank feed was not verified (**unverified**).

---

### 4. Repairs that stall, and a lever most renters have never heard of

**What people say.** Renters report the same fault for months and are told it will be looked at. One fell through a rotten deck board they had reported at several inspections. One lived with black mould for five years, finally served a 14-day notice, and was told to leave in five days. Others do not know whether the fourteen days are calendar days, whether to serve a notice or go straight to the Tribunal, or whether they may call an electrician themselves and send the bill. Many will not push at all, for fear of a 90-day notice.

**Who has it.** Renters. In the survey 8.6% had issued a 14-day notice, 56.2% had not and 35.2% had never heard of one; of those who used one, 57.1% (160 people) said it worked. A landlord or manager who will not fix things is listed third among the problems renters chose (the report prints the chart without a figure for it). In tenant applications for the quarter: Healthy Homes 33.63%, failure to maintain 28.57%, work order 14.73%.

**Sources.**
- RU-2026, pp. 5 and 39.
- TS-STATS.
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1tn1g95/home_has_black_mould_issue_for_5_years_landlord/ (25 May 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1pn0epb/decks_rotten_board_broke_when_i_was_walking_and_i/ (15 Dec 2025); https://www.reddit.com/r/LegalAdviceNZ/comments/1xk7y84/14_day_notice_to_remedy_information/ (31 Oct 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1x6x3i1/14_day_notice_vs_straight_to_tt_application/ (15 Oct 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1xbheey/when_is_it_reasonable_to_bring_in_an_electrician/ (21 Oct 2026).

**Today in the product.** Pool has fault reporting with self-help and a ticket the renter can follow and dispute. Loop triages, quotes and checks entry notices. There is no clock the renter can see, and no next step for the renter when the landlord does nothing. The notice-to-remedy date calculator exists (`rules/tenancy.ts`) but only the landlord can use it, for arrears.

**Build.** Give the ticket a clock and the renter the next step.
- Each ticket shows the date the landlord said it would be dealt with, or the triage tier's target. Loop's target is marked "not law".
- When that date passes, Pool offers a 14-day notice to remedy, drafted from the ticket, with the expiry date worked out by the existing calculator and shown step by step. It is served through the product, so both sides hold the same timestamped copy.
- When the notice expires, Pool offers the same evidence pack the landlord gets, built from the ticket history, with the same redaction.
- The landlord sees all of this coming. The action queue shows "notice likely in 3 days" before it happens, which is the fair version of the same feature.
- Whether and when a renter may arrange an urgent repair and recover the cost was not read at a primary source today (**unverified**); do not ship guidance on it until it is in the rule pack.

---

### 5. Leaving a fixed term early

**What people say.** A couple buying their first home found replacement tenants and the manager refused them over a dog and said the outgoing tenants would pay the reletting costs. Another manager wanted rent until relet plus a letting fee of a week's rent. A third added two weeks' rent because, she said, notice was needed three weeks before a three-month term ended. A co-tenant leaving a three-person flat asks whether they stay liable if nobody fills the room. A tenant with motor neurone disease had to go to the Tribunal to have the term cut short; the landlord had claimed rent to the end.

**Who has it.** Renters mostly; landlords who do not know what they may charge. "Reduction of fixed term" is in 220 tenant applications in the quarter (16.12%).

**Sources.**
- TS-STATS.
- A fee for agreeing to end early may cover only actual and reasonable costs; a landlord must consider every assignment request and not refuse unreasonably; the Tribunal can end a term for severe hardship: https://www.tenancy.govt.nz/ending-a-tenancy/ending-a-fixed-term-early/ (read 14 Nov 2026).
- A change of tenant by variation needs the landlord and all continuing tenants in writing and cannot be charged for; assignment costs need a breakdown and invoices: https://www.tenancy.govt.nz/ending-a-tenancy/change-of-landlord-or-tenant/change-of-tenant/ (read 14 Nov 2026).
- https://www.nzherald.co.nz/nz/tenant-with-motor-neurone-disease-wins-auckland-rent-dispute-with-landlord/QTJ7DGMXGRF5HFHCD6LSGW6HC4/ (7 Nov 2026).
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1p62t1p/bought_our_first_house_property_manager_is/ (25 Nov 2025); https://www.reddit.com/r/LegalAdviceNZ/comments/1xkj3kf/ending_a_fixed_term_tenancy_early/ (31 Oct 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1riltnc/property_manager_wants_2_weeks_extra_rent_to_end/ (2 Mar 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1xac0kc/tenancy_advice/ (19 Oct 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1xtzu98/whats_the_best_way_to_end_a_fixedterm_tenancy/ (12 Nov 2026).

**Today in the product.** Loop shows the fixed-term notice window and has a change-of-tenant variation with a reply-by date. The scanner blocks break-fee and no-assignment clauses. The assistant can explain assignment. There is no flow for a tenant who needs to go, and nothing that works out what the landlord may charge.

**Build.** A **"leaving early"** request in Pool and its answer in Loop.
- The renter picks what they are asking for: end by agreement, pass the tenancy to someone, or swap one named tenant. Each shows what it needs and who must sign.
- Loop answers with a costs sheet that only accepts actual costs with an invoice attached (advertising, a credit check), and refuses rent-until-relet stated as a flat sum or a letting fee, with the reason. A variation shows a cost of nil.
- A replacement applicant goes through the same staged-privacy application as anyone else, so "refused unreasonably" has a record either way.
- A reletting log (date advertised, viewings, offers) because the landlord's effort to relet is what a Tribunal will look at; the Herald case turned partly on months of warning.
- The fixed-term window reminder goes to the renter as well, at the opening of the window, in plain words: what happens if nobody says anything.

---

### 6. Water and other bills passed on

**What people say.** This is mostly a landlord's dispute, and it shows in the counts more than in the forums. Landlords claim unpaid outgoings at the Tribunal in large numbers, and in August 2026 the regulator published a notice on what can and cannot be passed on after water billing changed in Wellington. On the renter's side, a student renting a room above a garage was told she would be charged $100 a week more if she kept using power at night. A landlord whose tenants left a shower running for three weeks asks who gets the gas bill.

**Who has it.** "Outgoings" is in 1,388 applications in the quarter (17.40%), 1,355 of them from landlords (20.49% of landlord applications). It is the fifth most common dispute type and was not in round one.

**Sources.**
- TS-STATS.
- The landlord pays the whole water account and asks to be reimbursed; a tenant pays only where there is a separate meter, charges are by metered use and are attributable only to them; fixed charges that fall due whether or not the home is occupied stay with the landlord; the tenant should be sent a copy of the bill: https://www.tenancy.govt.nz/rent-bond-and-bills/water-and-wastewater-charges/ (read 14 Nov 2026).
- From 1 July 2026 owners in Wellington, Porirua, Lower Hutt and Upper Hutt get a separate Tiaki Wai bill; unmetered charges cannot be passed on: https://www.tenancy.govt.nz/about-tenancy-services/news/tiaki-wai-water-charges-what-landlords-and-tenants-need-to-know/ (18 Aug 2026).
- Bills shared between tenancies are the landlord's: https://www.tenancy.govt.nz/rent-bond-and-bills/utilities-and-other-payments/ (read 14 Nov 2026).
- Adding a water claim to an arrears application lengthens the hearing and can cost its priority: https://www.tenancy.govt.nz/disputes/tribunal/tenancy-tribunal-scheduling/ (read 14 Nov 2026).
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1v72ll6/my_landlord_warned_me_that_i_spent_400_a_month_on/ (26 Jul 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1uikm0v/who_is_responsible_for_an_electric_bill/ (29 Jun 2026).

**Today in the product.** The clause scanner has an outgoings rule, the assistant has a taught answer on water, and Money lets the landlord type "water charges for September" as income. Nothing reads a bill, splits it or sends it.

**Build.** A **water charges** step on a tenancy that has a separate meter.
- The landlord adds the supplier's bill. Loop asks for the lines and sorts them: volumetric water and volumetric wastewater to the tenant, fixed and unmetered lines to the landlord, each with its `<Why>`.
- A home with no separate meter, or a meter shared between tenancies, gets a refusal with the reason, not a form.
- The renter receives the amount, the period, the meter readings and a copy of the bill with the owner's details removed, in Pool, with a due date.
- Unpaid amounts sit in the same ledger as rent but are never mixed into the rent figure, so an arrears application can be kept to arrears.
- One rule-pack entry per supplier region that bills differently (Watercare, Tiaki Wai). Each needs its own source file in `docs/research/`.

---

### 7. Winning at the Tribunal and not being paid

**What people say.** A renter won on 5 October 2026, wrote twice, and two weeks later had nothing and no idea what came next. Survey respondents say the same: one was repaid at $5 a week; another said, "I won but he just delayed doing anything till my lease ran out". A new landlord granted a possession order did not know whether belongings left behind meant he still needed an eviction warrant, and could reach nobody at the weekend.

**Who has it.** Both. No count of unenforced orders was found (**unverified** how common). That landlords with money orders against former tenants have the same trouble is likely but was not evidenced in what was read.

**Sources.**
- RU-2026, pp. 40–41.
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1x9fkd8/nz_tenancy_tribunal_won_my_case_landlord_refuses/ (18 Oct 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1wkfkl7/any_experience_with_possession_orders/ (19 Sep 2026).
- Orders are enforced through the Ministry of Justice Collections Unit; it needs the debtor's current address, and Tenancy Services has a service to help find one; options include an attachment order on wages or benefits and a warrant to seize property; a possession order is enforced by filing for an eviction warrant, and goods left behind may need a disposal order; enforcement fees can be added to the debt: https://www.tenancy.govt.nz/disputes/enforcing-decisions/ and https://www.tenancy.govt.nz/disputes/enforcing-decisions/enforcing-orders-from-the-tribunal/ (read 14 Nov 2026). Fee amounts and timeframes are not on those pages (**unverified**).
- FastTrack Resolution turns an agreed repayment plan into a sealed order; the agreement must state the amount to the day before payments start, how it is repaid, the start date and what happens on default: https://www.tenancy.govt.nz/about-tenancy-services/news/make-agreements-clear-and-avoid-stress-later-with-fasttrack-resolution/ (15 Apr 2026).

**Today in the product.** The Tribunal pack is assembled and redacted, and Loop says plainly that it does not file. The story ends there. The assistant mentions FastTrack in one answer. There is no record of an order, a payment plan or what has been paid against either.

**Build.** An **"after the order"** record on a tenancy, for either side.
- Enter the order: who owes whom, how much, by when. Payments against it are tracked from the same bank feed.
- If the date passes, the next steps appear in order with their sources: write once, then apply to Collections; what the form asks for; the address question first, because Collections cannot act without one.
- For a possession order: what happens at the handover time, when an eviction warrant is needed, and what to do with goods left behind. The product has nothing on abandoned goods today, and each of these needs a sourced rule-pack entry first.
- A repayment-plan builder that produces exactly the four things FastTrack needs, so an agreed plan can be sealed and not just promised.
- Keep the address for service current during the tenancy (the regulator's own tip), since that is what makes enforcement possible later: https://www.tenancy.govt.nz/about-tenancy-services/news/5-tips-for-better-prepared-tenancy-tribunal-applications/ (11 Jun 2026).

---

### 8. Waiting for a hearing on arrears

**What people say.** The Tribunal itself says the number and complexity of disputes have grown and some cases wait longer. Survey respondents call the wait long enough that people give up. No waiting time in weeks is published on the pages read (**unverified** how long).

**Who has it.** Landlords with arrears; renters in unsafe homes.

**Sources.**
- A pilot from 3 August to 30 October 2026 gave priority to arrears applications that claim only termination, possession, arrears and the bond, where rent is 21 days behind or a 14-day notice has run out, and where the landlord has tried mediation. Extra claims such as water or damage lengthen the hearing and can drop the priority: https://www.tenancy.govt.nz/about-tenancy-services/news/tenancy-tribunal-pilot-to-prioritise-some-applications/ (27 Jul 2026).
- The scheduling page still lists the same categories on 14 Nov 2026 without calling them a pilot: https://www.tenancy.govt.nz/disputes/tribunal/tenancy-tribunal-scheduling/. Whether the pilot was made permanent is **unverified**.
- From 1 January 2026 almost everything filed is shared with the other party: https://www.tenancy.govt.nz/about-tenancy-services/news/important-change-how-the-tenancy-tribunal-handles-documents/ (22 Dec 2025).
- Applications stall on wrong party names: trading names, a trust without its trustees, a manager named as landlord: https://www.tenancy.govt.nz/about-tenancy-services/news/tips-to-make-tribunal-applications-smoother/ (5 Feb 2026).
- Property managers report claims running to around 200 pages that read as machine-written; one, with a 101-page report, sought $40,000 and was awarded $80; the Tribunal has published guidance on using AI: https://www.nzherald.co.nz/nz/tenancy-tribunal-issues-new-artificial-intelligence-guidelines-amid-concerns-over-cases-with-ai-slop/HUNYEY3O4VFO5HPNNXTI7SDDHI/ (7 Aug 2026). The guidelines themselves were not read (**secondary**).

**Today in the product.** At 21 days the action queue says the landlord can apply and the pack is ready. The pack is one bundle. Redaction before filing already matches the January 2026 change.

**Build.**
- Split the pack: an **arrears-only** application (termination, possession, arrears, bond) and a separate one for everything else, with one sentence on why.
- Put mediation and a repayment plan in front of the application as a step, since trying mediation is a condition of the faster track.
- A names check before export: the landlord as it appears on the title or the Companies Register, every trustee listed, tenants exactly as on the agreement.
- Keep the pack short and factual, with a page count shown. Never put assistant-phrased text into it.

---

### 9. A rent review that only goes up, and renters with no evidence

**What people say.** Through late 2025 and early 2026 rents fell, landlords offered incentives, and the Housing Minister told renters to negotiate. Renters who tried mostly failed: of the 251 survey respondents who had asked for or been offered a reduction in six months, 62 got one and 92 were refused or had rent raised. They say "market rent" is whatever the other side says it is. A self-managing landlord, meanwhile, asked how to give a week's rent off at Christmas without creating a problem.

**Who has it.** Both. 38.3% of survey respondents had an increase in the past year, 31.7% of those by more than $50 a week.

**Sources.**
- RU-2026, pp. 4 and 32–34.
- National rents fell 1.8% over 2025, Wellington 9.7% (realestate.co.nz figures, **secondary**): https://thespinoff.co.nz/business/03-02-2026/rent-is-getting-cheaper-heres-why-thats-not-necessarily-a-good-thing (3 Feb 2026).
- https://www.rnz.co.nz/news/politics/580772/negotiate-with-your-landlord-housing-minister-s-message-to-renters (3 Dec 2025).
- The market has since turned: October 2026 median $625 a week, up 2.5% on the year, demand up 15% and new listings down nearly 7%: https://www.trademe.co.nz/c/property/news/rental-price-index (11 Nov 2026).
- A temporary reduction can be agreed in writing for a set period with an end date, with no notice needed to return to the old rent; a tenant who thinks rent is well above similar homes should ask with evidence first, then may apply to the Tribunal: https://www.tenancy.govt.nz/rent-bond-and-bills/rent/increasing-rent/ (read 14 Nov 2026). The time limit for a periodic tenant to challenge an increase is not on that page (**unverified**).
- Tenancy Services publishes quartile rents by suburb, type and bedrooms from bond data, and warns against using it alone: https://www.tenancy.govt.nz/rent-bond-and-bills/market-rent/.
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1pjk2tq/rent_reduction_for_christmas/ (11 Dec 2025).

**Today in the product.** `RentReview.tsx` asks "is an increase worth the risk" and shows the suburb median from bond data with the cost of an empty home. It has no outcome other than an increase or no change. Pool shows nothing about market rent.

**Build.**
- Make the review two-way: raise, hold, or reduce. The vacancy arithmetic already there is the argument for holding.
- A **temporary reduction** as a signed variation with a start date, an end date and the rent it returns to. This covers hardship, a room out of use during repairs, and the Christmas week.
- In Pool, "Is my rent in line?": the same bond-data quartiles the landlord sees, for the same suburb, type and bedrooms, with the regulator's caution attached, and a request the renter can send with that evidence.
- When a rent increase notice is served, the renter sees the same comparison beside it.

---

### 10. "Compliant" on paper, mouldy in fact

**What people say.** Renters hold a signed statement saying the home passes and live with damp. Of survey respondents told or shown their home complied, 42.7% still reported mould, damp or draughts; 18.7% said their home plainly did not comply. Anyone can sign the assessment, including the landlord. A tenant renting one room measured about 7°C in it, was barred by the agreement from using a heater there, and could find a heating rule only for the living room.

**Who has it.** Renters; and the first-time landlord who signs in good faith and is wrong. Tenant applications in the quarter: Healthy Homes 459 (33.63%), moisture and drainage 181 (13.26%).

**Sources.**
- RU-2026, pp. 27–30.
- No qualification is required to assess, and landlords need not use an independent assessor: https://www.rnz.co.nz/news/business/567232/mark-your-own-homework-healthy-homes-checks-under-fire-for-diy-loophole (17 Jul 2025).
- MBIE has no national compliance estimate; 463 complaints and 634 recorded breaches from July 2025 to May 2026, the commonest being gaps and holes (133), heating (119), extractor fans (107) and drainage (99) (**secondary**, MBIE figures as reported): https://www.nzherald.co.nz/nz/healthy-homes-standards-mbie-has-no-national-compliance-estimate/Q5V7UDD2MZFHXJSWYSCN6EBYCM/ (3 Aug 2026).
- TS-STATS.
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1sv7v7o/our_room_temperature_goes_down_to_7_celsius/ (25 Apr 2026).

**Today in the product.** Loop walks the landlord through each standard and scores the home. Pool's listing shows the result and is honest about its origin ("as the owner recorded it"). That is exactly the self-assessment renters distrust, and nothing distinguishes a guess from a measurement.

**Build.**
- An **evidence grade** on each standard, shown wherever the result is shown: stated by the owner, backed by a photo or a measurement (heater output against the required figure, fan duct size), or assessed by a named independent person with their report attached.
- Order the guided walk by what fails most: gaps and holes, heating, extractor fans, drainage.
- A renter-side **"what I'm living with"** log: dated photos by room, and a temperature or humidity reading if they have one. A repeat entry opens a repair ticket already flagged as a Healthy Homes matter.
- Say plainly in Pool what the heating standard does and does not cover, once that sentence has a source in the rule pack.

---

### 11. Notices: renters cannot serve one or check one

**What people say.** A renter was told verbally they had 90 days, then received an email dressed up to look as if it had been sent forty days earlier. Another was told their notice would not be taken until the office reopened after Christmas. Another asks whether an email giving a time but no date counts as notice of entry; the landlord walked in while they were showering. Flatmates had groups of strangers arriving for viewings with no dates given.

**Who has it.** Renters. "Quiet enjoyment" is in 287 tenant applications in the quarter (21.03%).

**Sources.**
- TS-STATS.
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1r65xth/agent_didnt_serve_written_termination_noticethen/ (16 Feb 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1prsneg/property_manager_wont_accept_notice_for_periodic/ (21 Dec 2025); https://www.reddit.com/r/LegalAdviceNZ/comments/1w4x5ld/does_this_count_as_24_hour_notice_from_landlord/ (2 Sep 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1v9o3jb/landlord_keeps_sending_people_to_view_flat/ (29 Jul 2026).

**Today in the product.** Every landlord notice is dated by calculator and cannot be edited once served. Pool shows notices the renter has received. The renter cannot give notice through Pool and cannot test a notice that arrived some other way.

**Build.** The calculators exist; point them the other way.
- **Give notice** in Pool: ending a periodic tenancy, or saying what happens at the end of a fixed term. The date is worked out and shown, and the served copy is timestamped for both.
- **Check a notice I was given**: the renter enters the kind, the date received and the date it says. Pool answers valid or not, with the steps. This is useful to renters whose landlord is not on Loop, which makes it a way in.

---

### 12. Inspections that feel like surveillance

**What people say.** The survey reports that many renters want fewer inspections, which they find invasive and patronising, and it recommends a limit of once a year. A mother of five with a spinal injury is inspected every two months. Others describe a landlord who drops in.

**Who has it.** Renters. No percentage was published.

**Sources.**
- RU-2026, pp. 36 and 45.
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1xstw0c/regular_rental_inspections/ (10 Nov 2026).

**Today in the product.** The inspection rhythm comes from the landlord's insurance policy, the notice window is enforced, and the studio is thorough. The renter sees the date and their rights. They are not told why this often.

**Build.**
- Show the renter the reason for the frequency: "the owner's insurer asks for one every N weeks", from the policy on file. Never schedule more often than that.
- Offer a **renter-led check-in** for alternate inspections: the renter photographs a short list of rooms in Pool. Whether insurers accept this in place of a visit is **unverified**; ask two insurers before building.
- A pre-inspection note that says what is being looked at and that housekeeping is not being judged.

---

### 13. References, retaliation and the fear of being marked

**What people say.** After a Tribunal hearing a former landlord rang the tenants' new landlord to take back the reference and tell him about the case. Three students who lost a damp claim believe every application now dies at the reference call. Survey respondents say they will not use the Tribunal because they expect to be blacklisted, and describe landlords naming tenants in investor Facebook groups.

**Who has it.** Renters. 24.9% of survey respondents said they had been discriminated against by a landlord or manager, most often as solo parents.

**Sources.**
- RU-2026, pp. 37–40.
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1xrec9n/former_landlord_contacted_our_new_landlord_to/ (9 Nov 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1xnxzr7/suspected_bad_landlord_reference/ (4 Nov 2026).
- The Privacy Commissioner's position on tenant blacklists is in round one and was not re-read today.

**Today in the product.** The Passport counts only verified facts, and the applicant view has no Tribunal field. But a past home only counts once "that landlord confirms it", and the care score comes from the landlord's inspections. A hostile former landlord can therefore hold a renter's record hostage.

**Build.**
- Let rent history be verified from the renter's own bank evidence when a landlord does not answer within a set time, and label it by how it was verified.
- A **reference by facts**: the former landlord answers fixed questions drawn from the ledger (dates, rent on time, notice given, bond returned in full) with no free-text box, and the renter sees exactly what was said.
- State in Pool and in Loop that using the Tribunal is never recorded against a renter.

---

### 14. Pets: the law changed, the arguments did not

**What people say.** A landlord consents to a kitten on condition the tenants pay for a cat door in double glazing and for its removal. Another refuses an indoor cat because of carpets while two dogs already live there. A landlord asks whether an unmown lawn is a reason to refuse. Renters say a pet bond on top of four weeks' bond and two weeks' rent puts moving out of reach; one paid nearly $6,000 up front.

**Who has it.** Both. No count found.

**Sources.**
- Pet rules from 1 December 2025: https://www.tenancy.govt.nz/law-changes/ (read 14 Nov 2026).
- RU-2026, pp. 17–18.
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1w9lnnh/landlord_forcing_cat_door_installation/ (7 Sep 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1qk9l3t/landlord_refusing_request_for_indoor_cat_are/ (22 Jan 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1xmgvbv/reasons_for_not_permitting_pets/ (3 Nov 2026).

**Today in the product.** Already the strongest of these areas: a pet request in Pool, a reply-by date in Loop, a list of conditions in the rule pack, pet damage outside the careless cap, and move-in cost on the listing.

**Change, do not build.** When a landlord refuses, make them choose a ground from the pack's list and show the renter the ground and its source. When they add a condition, check it against the pack's list and question anything not on it. The regulator's own page of examples could not be reached today (**unverified**), so confirm the lists in `nz.ts` against it.

---

### 15. Flatmates and boarders: the people the Act does not cover

**What people say.** A flatmate was told to be out before they had moved in, by a message from the head tenant passing on the owner's decision. An owner with a flatmate who stopped paying after two weeks asks whether the Disputes Tribunal is worth it. Owner-occupiers who told a flatmate there was a six-month minimum had her give a week's notice the day after she arrived. A first-home buyer renting rooms describes damage and arrears beyond the bond. Rent sent to a flatmate went to the wrong payee. The regulator published a flowchart this year because people keep applying to the wrong tribunal.

**Who has it.** Renters who are not on the agreement, and owner-occupiers with a room to let. Trouble with flatmates is on the survey's list of problems; no figure is given in the text.

**Sources.**
- Flatmates are outside the Act; their disputes go to the Disputes Tribunal; Tenancy Services offers a flat-sharing agreement template: https://www.tenancy.govt.nz/starting-a-tenancy/flatting/ (read 14 Nov 2026).
- https://www.tenancy.govt.nz/about-tenancy-services/news/new-guidance-to-help/ (17 Mar 2026).
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1pjaypu/served_notice_before_i_even_moved_in_tenancy_help/ (10 Dec 2025); https://www.reddit.com/r/LegalAdviceNZ/comments/1qjm9a2/homeowner_and_flatmate_is_this_worth_taking_to/ (22 Jan 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1q2qhkv/i_have_a_boarder_that_i_would_like_to_move_out/ (3 Jan 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1x62rcg/accidentally_paid_wrong_person/ (14 Oct 2026).
- r/PersonalFinanceNZ: https://www.reddit.com/r/PersonalFinanceNZ/comments/1q78kbf/first_home_buyers_that_are_renting_to_winz_first/ (8 Jan 2026); https://www.reddit.com/r/PersonalFinanceNZ/comments/1tjerk4/bought_a_3_bedroom_house_and_dont_want_flatmates/ (21 May 2026); https://www.reddit.com/r/PersonalFinanceNZ/comments/1vqe4dc/lessons_learned_dealing_with_an_early_termination/ (17 Aug 2026).

**Today in the product.** Co-tenants on the agreement are handled, including a change of tenant. A flatmate who is not on the agreement does not exist in the data model, and neither does an owner who lives in.

**Build, small first.** A one-screen **"which arrangement am I in?"** in Pool: tenant, flatmate or boarder, what law applies and which tribunal hears it. That is the regulator's flowchart made interactive, and it is honest about where the product stops. A flat ledger for rent and bills between flatmates is a larger, separate product; do not start it without more evidence.

---

### 16. When something big goes wrong: insurance

**What people say.** A landlord whose tenants left a broken shower running for three weeks asks who pays the gas bill. Another, whose rental burned down, says they do not know what they do not know about the claim. An insurer's session for investors lists the usual failures as poor records, missed maintenance and rushed claims.

**Who has it.** Landlords. Evidence is thin: two posts and a session description.

**Sources.**
- LANZ: https://www.reddit.com/r/LegalAdviceNZ/comments/1uikm0v/who_is_responsible_for_an_electric_bill/ (29 Jun 2026); https://www.reddit.com/r/LegalAdviceNZ/comments/1umz0zz/my_rental_house_burned_down_last_week/ (4 Jul 2026).
- https://apia.org.nz/apia-tv/the-insurance-mistakes-that-could-cost-landlords-thousands/ (about August 2026; description only).

**Today in the product.** The policy, its renewal and its inspection condition are tracked. There is no claim.

**Build.** A **claim file** export: the policy, the inspection history, the entry report, the repair log and the photos for one property and one date range. Round one found a myRent user who could not export records for an insurer, so the same export answers both.

---

### 17. Applicants who are not who they say

**What people say.** An investors' association ran a session on organised identity fraud in rental applications and AI-forged supporting documents, presented by a tenant-screening company's executive. Only the description was readable.

**Who has it.** Landlords. **Unverified** beyond that one vendor-led session; no numbers.

**Source.** https://apia.org.nz/apia-tv/fake-ids-fakier-tenants/ (about March 2026).

**Today in the product.** An identity-checked badge and staged collection.

**Build.** Nothing yet. If pursued, prefer evidence verified at its origin (a bank-confirmed income figure the renter chooses to share) over uploaded documents, which is also what the privacy stages favour. Get real evidence first.

---

## What contradicts the product's current assumptions

1. **A rent review is not always an increase.** `RentReview.tsx` frames one question: is an increase worth the risk. For most of the past year the live question in Wellington and Auckland was whether to hold or cut, and Tenancy Services has a page on agreeing temporary reductions. The market has turned again (Trade Me, October 2026), which is the point: the screen should work in both directions. See section 9.

2. **A former landlord is not a neutral verifier.** The Passport gives full weight only to what a landlord confirms and to inspections a landlord ran. Two posts in one fortnight describe former landlords using references to retaliate after a Tribunal case, and survey respondents avoid the Tribunal for fear of it. See section 13.

3. **"Warm and dry, from the home's own compliance record" is a weaker answer than it sounds.** The label is honest, but 42.7% of surveyed renters told their home complied still reported mould, damp or draughts, and the regulator does not check. Without an evidence grade, Pool repeats the landlord's opinion. See section 10.

4. **No-cause termination may not last.** `EndGround` includes `no_cause`. Labour's 2026 policy is to ban no-cause evictions (https://www.rnz.co.nz/news/politics_election-2026/feature/housing-policy-guide, updated 28 Oct 2026). The election was held on 7 November 2026; on 13 November about 400,000 special votes were still being counted and no government had formed (https://www.rnz.co.nz/news/political). Rulewatch will catch a law change, but the end-of-tenancy flow, the copy that explains it and the Pool wording should be ready to lose a ground. In the survey, 39.8% of those who commented on recent law changes raised fear of no-cause or retaliatory eviction, though only 11 respondents reported receiving one.

5. **The Tribunal pack is one bundle; the Tribunal now rewards a narrow one.** The arrears priority track is for applications that claim arrears, termination, possession and the bond only, after mediation. See section 8.

6. **The bond sheet assumes a reference is the whole record.** Since 29 June 2026 a landlord cannot transact without an LNL- ID and a tenant cannot accept a refund without a tenant number. See section 2.

7. **Half the renters Pool could serve do not rent from a self-managing landlord.** 51.1% of the survey's private renters rent through a property manager (self-selecting sample), and HUD's figure in round one is about 55%. An unknown number more are flatmates outside the Act. The Pool features that work without a Loop landlord (the notice checker, the rent comparison, the arrangement checker) are the ones that reach them.

Confirmed, not contradicted:
- The first-time landlord is still the right person to build for. Owners who could not sell and let the home instead are a growing group; an adviser quoted says many have not considered the Act or the Healthy Homes rules, and one faces a Tribunal case over them. Cotality counts about 3,000 homes a year withdrawn from sale and listed for rent within three months (**secondary**): https://www.nzherald.co.nz/business/the-rise-of-accidental-landlords/CWSLPHKFM5BHZG7PUDUDSJFY5A/ (20 Sep 2026).
- Redacting a pack before it leaves matches the Tribunal's rule that almost everything filed is shared (from 1 January 2026).
- An assistant that never guesses matches the Tribunal's August 2026 concern about machine-written claims.
- Private landlords stay outside the proposed Residential Property Managers Registration Bill, which had still not been introduced when the HUD page was last updated on 24 March 2026 (https://www.hud.govt.nz/our-work/regulating-residential-property-managers). The page does not say whether a software platform would count as a property management organisation (**unverified**).

---

## Ranked

Evidence: **strong** means an official count plus independent voices; **medium** means several independent voices or one good dataset; **weak** means one or two posts or a vendor's claim. Fit is how squarely it sits in what the product already is. Effort is rough.

| # | Pain | Evidence | Fit | Effort |
|---|---|---|---|---|
| 1 | Bond deductions at move-out that nobody can justify (section 1) | Strong | High: inspections, photos and the damage cap already exist | Medium |
| 2 | Arrears nobody can point to; no statement of rent for the renter (3) | Strong | High: the ledger exists, Pool needs to read it | Small to medium |
| 3 | Stalled repairs and the unknown 14-day notice (4) | Strong | High: tickets and the date calculator exist | Small to medium |
| 4 | Water and outgoings passed on (6) | Strong | High for Loop; new data entry | Medium |
| 5 | Leaving a fixed term early (5) | Strong | High: variations and the scanner exist | Medium |
| 6 | Bond records that do not match reality (2) | Medium | High: fields and prompts on an existing record | Small |
| 7 | Rent review in both directions, and market evidence for renters (9) | Medium | High: the comparison already exists in Loop | Small to medium |
| 8 | Winning and not being paid (7) | Medium | Medium: new record, mostly guidance | Small to medium |
| 9 | "Compliant" on paper (10) | Strong | High, but changes how the score is read | Medium |
| 10 | Renters cannot serve or check a notice (11) | Medium | High: the calculators exist | Small |
| 11 | Arrears applications shaped for the priority track (8) | Medium | High: a split of the existing pack | Small |
| 12 | References and retaliation (13) | Medium | Medium: changes the Passport's rules | Medium |
| 13 | Inspections that feel like surveillance (12) | Medium | Medium; the renter-led check-in depends on insurers | Small, then medium |
| 14 | Pets (14) | Medium | Already built; tighten refusals and conditions | Small |
| 15 | Insurance claim file (16) | Weak | Medium: an export of records already held | Small |
| 16 | Flatmates and boarders (15) | Medium | Low beyond a one-screen checker | Small for the checker, large for a ledger |
| 17 | Applicant fraud (17) | Weak | Medium | Do not start |

---

## Still unverified

- The age or depreciation rule a Tribunal applies to a damage claim.
- The time limit for a periodic tenant to challenge a rent increase.
- Whether a renter may arrange an urgent repair and recover the cost, and on what conditions.
- How long Tribunal hearings currently take to schedule, and whether the 2026 priority pilot is permanent.
- Enforcement fees and timeframes at the Ministry of Justice.
- How many Tribunal orders go unpaid.
- Whether insurers accept a renter-led photo check-in in place of a visit.
- The regulator's examples of reasonable grounds and conditions for pets (page not reached).
- Whether a software platform would fall inside the proposed property-manager regime.
- The Tony Alexander investor survey (July 2026). Its earlier figure, 38% of 200 small landlords planning to sell, is cited from https://theconversation.com/mum-and-dad-investors-are-pulling-back-what-will-that-mean-for-nzs-housing-market-281427 (29 Apr 2026), not from the survey.
- Anything from r/newzealand, r/auckland, r/Wellington, r/chch, PropertyTalk, the Property Investors' Federation, Citizens Advice Bureau or the app stores. None was read.
