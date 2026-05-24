#!/usr/bin/env python3
"""Generate news/articles/*.json from embedded payloads. Run: python3 scripts/build_news_article_json.py"""

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "news" / "articles"
HERO = "/images/articles/hero-default.svg"


def block(*parts):
    return "\n\n".join(parts)


def faq(q, a):
    # Plain semantic HTML only — parent Article uses `prose` (Tailwind classes here would not be compiled from JSON).
    return f"<h3>{q}</h3>\n<p>{a}</p>"


ARTICLES = [
    {
        "slug": "story-01-ukraine-fpv-warfare",
        "title": "FPV Drones and the Rewriting of Land Warfare: What Changed After 2022",
        "sub_heading": "How small commercial-grade UAS, AI-assisted workflows, and electronic warfare forced doctrine and procurement to sprint—and what operators should watch next.",
        "hero_image": HERO,
        "seo_phrases": [
            "FPV drone",
            "military drone technology",
            "UAS electronic warfare",
            "autonomous drone systems",
            "drone warfare Ukraine",
            "dual-use drone components",
        ],
        "body_html": block(
            "<p><em>Battlefield details change quickly—verify dates before citing in class or publishing.</em></p>",
            "<p>Picture a squad on a tree line watching a $400 foam quadcopter—not a jet—decide whether an armored column moves today. That scene, repeated thousands of times a month, is why Western militaries rewrote procurement timelines in the 2020s. The war did not invent drones. It proved something harder for big institutions to absorb: when the sky is full of jamming and every radio link is suspect, the side that <strong>iterates fastest</strong>—not the side with the shiniest airframe—often sets the pace of the fight.</p>",
            "<p>When Russia’s full-scale invasion began in February 2022, Ukraine did not wait for a perfect military catalog. Volunteers, startups, and soldiers bolted together first-person-view (FPV) quadcopters from the same motors, batteries, and flight controllers that power racing drones and farm scouts elsewhere. The aircraft were crude by aerospace standards and terrifyingly effective by tactical ones. They spotted movement, corrected artillery in minutes instead of hours, and eventually carried strikes of their own. Doctrine written for a handful of exquisite platforms had to make room for thousands of expendable ones.</p>",
            "<p>Then the spectrum turned hostile. GPS spoofing and jamming made “smart” navigation dumb at the worst moments. Digital video links that felt rock-solid in a parking lot frayed over the front. Operators learned a grim rhythm: fly, lose link, change frequency, change antenna, change firmware, fly again—sometimes all in a week. The war became a contest of electronic warfare and counter-EW as much as flying skill. Out of that pressure came the twist that dominated headlines by 2025: <strong>fiber-optic tethers</strong> that carry control and video like a physical leash, immune to radio jamming because they are not radio at all.</p>",
            "<p>Imagine launching a drone with a spool of hair-thin fiber unspooling behind it. A jammer on the hill is useless. The pilot’s world shrinks to the screen and the cable—fragile, skill-heavy, logistics-heavy, but reliable in a way RF often was not. Press reporting described deliveries at very large scale and test routes stretching past earlier assumptions, with both Ukraine and Russia leaning into fiber while radio FPV still carried most sorties. In 2026, engineers experimented with hybrid brains: if the fiber snaps or tangles, the aircraft falls back to radio and tries to finish the run—trading perfect immunity for mission completion. Nothing about this is clean. Quality control, shortages, and a mix of state supply and civilian marketplaces remain part of the story, not just the highlight reel.</p>",
            "<p>Western capitals watched and scrambled. The U.S. <strong>Replicator</strong> initiative—explicitly shaped by Ukraine’s lesson of mass and upgrade speed—aimed to field thousands of attritable systems while a follow-on emphasis turned toward countering small drones that plague bases and convoys. NATO ran innovation challenges to detect fiber FPVs at short range because traditional jamming does not cut a cable. Analysts noted the U.S. was late to fiber at operational scale even as Ukraine and Russia iterated in the field. The gap is not only a missing gadget. It is a culture of <strong>3–4 week software refresh</strong> versus procurement clocks measured in years, and production systems that can surge many small shops instead of one immaculate line.</p>",
            "<p>If you teach Part 107 or run a civil program, this is not an invitation to romanticize combat footage. It is a case study in dual-use supply chains, headline literacy, and professional restraint. The same ESCs, radios, and cameras that fill hobby bags are debated in export-control hearings. “AI drone” clips rarely show full autonomy; they show humans in the loop with software shortening the path from sensor to decision—worth teaching students to verify before they repeat. The civil spillover is real but indirect: better GPS-denied navigation for inspection in canyons, serious BVLOS safety cases for logistics, thermal and mapping workflows for fire and agriculture—not fiber tethers on a wheat field.</p>",
            "<p>So the story closes where it opened: not with a wonder weapon, but with a tempo. Whoever adapts weekly—hardware, firmware, tactics, supply—keeps flying when the spectrum goes dark. Consumer-tier tech, scaled and cycled fast, changed land warfare in plain sight. The lesson for pilots training under FAA rules is the lawful mirror: documented maintenance, configuration control, and safety culture turn prototypes into fleets you can insure—not garage improvisation at wartime speed.</p>",
            "<h2>Questions answered along the way</h2>",
            faq(
                "Why did small FPV matter more than “big” military drones?",
                "Because mass and cost won the tactical math. Lose one aircraft Tuesday; fly another Thursday with new firmware. Exquisite platforms cannot be spent that way at that rhythm.",
            ),
            faq(
                "What broke GPS and radio—and what came next?",
                "Jamming and spoofing. Fiber for immunity; autonomy segments for dead links; hybrid fiber-to-radio failover in 2026 experiments when the tether fails.",
            ),
            faq(
                "Is this “AI warfare”?",
                "Usually human-in-the-loop strikes with AI helping detection, routing, or stabilization—not cinematic swarms. Teach students to question clips, not worship them.",
            ),
            faq(
                "What has the U.S. been slow to adopt—and could it help?",
                "Fiber FPV at scale; marketplace-style mass production; fast software cadence; mature GPS-denied stacks; component supply security. Civil benefit: resilient ops and regulation-ready autonomy—not importing combat tethers.",
            ),
            faq(
                "Could fiber help U.S. farmers or firefighters?",
                "Rarely as battlefield spools. Yes as a reminder to invest in thermal payloads, BVLOS maturity, and navigation when GNSS is poor.",
            ),
            "<figure style=\"overflow-x:auto;margin:2rem 0\"><svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 200\" aria-label=\"Conceptual diagram: feedback loop\" style=\"width:100%;max-width:100%;height:auto\"><rect width=\"640\" height=\"200\" fill=\"#1a1a1a\" rx=\"4\"/><text x=\"320\" y=\"28\" text-anchor=\"middle\" fill=\"#c9c9c9\" font-size=\"14\" font-family=\"system-ui\">EW pressure → link changes → new tactics → counter-EW (conceptual loop)</text><path d=\"M80 120 L200 80 L320 120 L440 80 L560 120\" stroke=\"#8ea66a\" stroke-width=\"2\" fill=\"none\"/><circle cx=\"200\" cy=\"80\" r=\"8\" fill=\"#8ea66a\"/><circle cx=\"440\" cy=\"80\" r=\"8\" fill=\"#8ea66a\"/></svg><figcaption>Illustrative only—not operational data.</figcaption></figure>",
        ),
        "marketability_review": "Strong search interest around “FPV,” “drone warfare,” and “electronic warfare.” Best positioned as analytical/education content for pilots and policy-curious readers—not sensational combat how-tos. Pair with courses on regulations and safety to convert interest responsibly.",
        "readability_review": "Inverted pyramid: takeaways first, then context, then FAQ. Section headings support scanning on mobile. Consider adding a one-line disclaimer that battlefield details evolve.",
        "considerations": [
            "Replace hero-default.svg with licensed stock or original imagery aligned with brand.",
            "Re-verify any date-sensitive claims before publishing.",
            "Add canonical sources (defense reporting, think tanks) if migrating to live CMS.",
            "Avoid export-controlled technical detail; keep strategic overview level.",
        ],
    },
    {
        "slug": "story-02-us-china-drone-restrictions",
        "title": "U.S. Policy, Chinese Drones, and the FCC Covered List: What Operators Should Know",
        "sub_heading": "National-security-driven market rules are reshaping who can sell radios in the U.S.—and what fleet owners should plan for next.",
        "hero_image": HERO,
        "seo_phrases": [
            "DJI drone ban",
            "FCC covered list drone",
            "commercial drone regulations",
            "UAS national security",
            "Autel drone",
            "drone import restrictions",
        ],
        "body_html": block(
            "<p><strong>In short:</strong> U.S. policy now couples drone buying with <strong>telecom authorization</strong> and national-security lists—not only FAA flight rules. Late 2025–early 2026 FCC actions broadly restricted new approvals for many foreign-produced UAS, then carved narrow exemptions for some <strong>Blue UAS</strong> and domestic-end-product paths—while DJI remained a focal restriction for new authorizations. <em>Verify FCC orders before enterprise decisions.</em></p>",
            "<h2>Key takeaways</h2><ul><li>Debate centers on firmware, telemetry, cloud sync, and update channels—not only country of assembly.</li><li>“Banned” often means <strong>no new FCC authorization/import path</strong>, not necessarily grounding every aircraft already owned.</li><li>Plan fleet refresh, spares, and contract compliance as a multi-year capital problem.</li><li>Blue UAS and allied alternatives matter for agencies; civil users face cost/capability tradeoffs.</li></ul>",
            "<p><strong>Story hook:</strong> Your program used to start with a Part 107 study guide. Now it also starts with a compliance spreadsheet: Who made the radio? Will this SKU still be importable next year?</p>",
            faq(
                "What changed in late 2025 and early 2026?",
                "Reporting describes a Dec 2025 Covered List expansion for foreign-produced UAS under NDAA national-security determinations, then Jan 2026 exclusions through early 2027 for certain Blue UAS Cleared List and domestic-end-product categories—check the FCC’s current Covered List FAQs and orders.",
            ),
            faq("Does this brick drones already purchased?", "Implementation targets <strong>new market access</strong> (authorization, import, sale of non-exempt models). Existing authorized aircraft may continue operating under separate FAA rules—confirm your model and date."),
            faq(
                "What is Blue UAS and why should I care?",
                "A defense-cleared list used in federal procurement; Jan 2026 FCC exclusions referenced it for some foreign-produced systems. Public-safety and enterprise RFPs increasingly mirror these trust assumptions.",
            ),
            "<h2>Operational planning for ag, film, and small business</h2><p>Document fleet models and firmware policies; budget refresh cycles; evaluate alternatives where insurers or municipalities require trusted vendors. Photography is not the only sector affected—<strong>farms and survey firms</strong> feel spare-part and upgrade risk acutely.</p>",
            faq(
                "How does this connect to Ukraine supply-chain stories?",
                "The same global component chains feed civil and military small UAS. Import rules (this story) and export controls (China’s rules) squeeze ESCs, radios, and cameras—not only finished drones.",
            ),
        ),
        "marketability_review": "High-intent commercial searches; pair with buyer’s guides and compliance checklists. Avoid fear-mongering—build trust with sourced timelines.",
        "readability_review": "Short sections; FAQ addresses the #1 user fear. Add internal links to Remote ID and training content.",
        "considerations": ["Legal landscape changes—date-stamp the article.", "Coordinate with counsel for enterprise statements.", "Swap hero for neutral product/compliance imagery."],
    },
    {
        "slug": "story-03-dji-pentagon-lawsuit",
        "title": "DJI, the Pentagon, and “Chinese Military Company” Labels: Legal and Market Ripples",
        "sub_heading": "How U.S. listings and litigation interact with procurement bans—and what civil-market readers should track.",
        "hero_image": HERO,
        "seo_phrases": ["DJI lawsuit", "Chinese military company list drone", "UAS procurement ban", "drone manufacturer compliance"],
        "body_html": block(
            "<p><strong>In short:</strong> Civil-market leaders contested U.S. government designations that affect federal business and reputational risk. The dispute highlights <strong>dual-use ambiguity</strong> in cameras, autonomy, and global supply chains.</p>",
            "<h2>Key takeaways</h2><ul><li>Legal labels can act like secondary sanctions in practice for some customers.</li><li>Civil vs. military product positioning remains contested in courts and press.</li><li>Global customers face compliance screens beyond Part 107.</li></ul>",
            "<p><strong>Hook:</strong> The courtroom story is really about <strong>trust infrastructure</strong> for networked devices—not just rotors and batteries.</p>",
            faq("Does this affect hobby pilots directly?", "Indirectly through market availability, firmware policies, and long-term vendor support—not usually day-to-day flight rules."),
            "<h2>Brand-safe framing</h2><p>Stick to documented filings and avoid speculative attribution. Educational sites win on clarity and neutrality.</p>",
        ),
        "marketability_review": "Niche but high authority for enterprise readers; weaker for consumer hobby traffic unless tied to buying advice.",
        "readability_review": "Keep acronyms expanded once; add timeline sidebar in CMS if possible.",
        "considerations": ["Monitor case updates.", "Avoid defamation risk—describe allegations as filed.", "Hero: scales of justice abstract, not logos."],
    },
    {
        "slug": "story-04-china-drone-export-controls",
        "title": "China’s Drone Export Controls: Global Supply Chains and Compliance",
        "sub_heading": "Export rules and Western scrutiny turned small UAS into geopolitical commodities—here is how compliance teams should read the landscape.",
        "hero_image": HERO,
        "seo_phrases": ["drone export controls", "China drone policy", "UAS compliance", "dual-use drone components"],
        "body_html": block(
            "<p><strong>In short:</strong> Beijing adjusted controls on unmanned systems and sensitive components while Western governments scrutinized diversion risks. <strong>Component-level</strong> rules matter as much as finished aircraft.</p>",
            "<h2>Key takeaways</h2><ul><li>Transshipment and end-use monitoring are persistent weak points.</li><li>Manufacturers emphasize civilian-only positioning; enforcement varies.</li><li>Mirror-image policies: import restrictions vs. export restrictions.</li></ul>",
            "<p><strong>Hook:</strong> Compliance is now a three-body problem: <strong>export law, import law, and your insurer’s questionnaire.</strong></p>",
            faq("Do training pilots need export counsel?", "Usually no for local Part 107 operations; yes if shipping hardware internationally or training foreign government clients—seek advice."),
            "<h2>Charts</h2><figure style=\"overflow-x:auto;margin:1.5rem 0\"><svg viewBox=\"0 0 520 120\" xmlns=\"http://www.w3.org/2000/svg\" style=\"width:100%;height:auto\"><rect fill=\"#1a1a1a\" width=\"520\" height=\"120\" rx=\"4\"/><rect x=\"20\" y=\"40\" width=\"120\" height=\"40\" fill=\"#404040\"/><rect x=\"160\" y=\"40\" width=\"120\" height=\"40\" fill=\"#8ea66a\"/><rect x=\"300\" y=\"40\" width=\"120\" height=\"40\" fill=\"#525252\"/><text x=\"260\" y=\"24\" text-anchor=\"middle\" fill=\"#c9c9c9\" font-size=\"12\" font-family=\"system-ui\">Illustrative: policy levers (not quantitative)</text><text x=\"80\" y=\"105\" text-anchor=\"middle\" fill=\"#c9c9c9\" font-size=\"11\">Export</text><text x=\"220\" y=\"105\" text-anchor=\"middle\" fill=\"#c9c9c9\" font-size=\"11\">Import</text><text x=\"360\" y=\"105\" text-anchor=\"middle\" fill=\"#c9c9c9\" font-size=\"11\">Ops</text></svg><figcaption>Conceptual diagram only.</figcaption></figure>",
        ),
        "marketability_review": "Strong B2B and policy audience; add downloadable compliance checklist for lead gen.",
        "readability_review": "Dense topic—keep sentences short; lead with takeaways.",
        "considerations": ["Cite official notices when publishing live.", "Avoid country stereotyping; stay procedural."],
    },
    {
        "slug": "story-05-faa-remote-id",
        "title": "FAA Remote ID for Drones: Transparency, Safety, and What Pilots Must Do",
        "sub_heading": "Digital identification is a building block for busier airspace—and a shift in how accountability works for Part 107 and recreational flights.",
        "hero_image": HERO,
        "seo_phrases": ["FAA Remote ID", "drone Remote ID rule", "Part 107 Remote ID", "UAS identification", "drone compliance 2024"],
        "body_html": block(
            "<p><strong>In short:</strong> Remote ID aims to make many drone operations observable to authorities and airspace participants, supporting integration and enforcement. Implementation has been <strong>phased</strong> with paths for built-in vs. add-on modules.</p>",
            "<h2>Key takeaways</h2><ul><li>Think “digital license plate,” not optional sticker.</li><li>Hardware and firmware paths differ by aircraft class.</li><li>Privacy debates persist around who can access ID data and how.</li></ul>",
            "<p><strong>Hook:</strong> Remote ID is less exciting than a new gimbal—but it is what unlocks <strong>scalable BVLOS rules</strong> later.</p>",
            faq("Does Remote ID replace Part 107 knowledge?", "No. It is an additional operational and equipment requirement layered on certificates and airspace rules."),
            "<h2>Mobile readers</h2><p>Use checklists: aircraft model, RID path, firmware version, and where you fly (controlled airspace vs. LAANC). Short paragraphs render well on phones.</p>",
        ),
        "marketability_review": "Evergreen high-traffic topic; update annually. Great for SEO landing pages and course upsells.",
        "readability_review": "Excellent FAQ potential; add schema.org FAQPage if exposed as HTML page.",
        "considerations": ["Confirm compliance dates from FAA primary sources.", "Link to FAA B4UFLY and RID FAQ."],
    },
    {
        "slug": "story-06-drone-delivery-commercial",
        "title": "Drone Delivery Beyond Demos: Logistics, BVLOS, and Neighborhood Acceptance",
        "sub_heading": "Retail and medical routes prove feasibility in pockets—scaling still hinges on regulation, weather, and local politics.",
        "hero_image": HERO,
        "seo_phrases": ["drone delivery", "BVLOS drone logistics", "autonomous delivery UAS", "last mile drone", "AI routing drones"],
        "body_html": block(
            "<p><strong>In short:</strong> Drone delivery matured from marketing stunts to <strong>limited operational routes</strong> where regulators, insurers, and communities align. AI helps routing and contingency planning—not magic autonomy in all conditions.</p>",
            "<h2>Key takeaways</h2><ul><li>Economics love route density; sparse suburbs are harder.</li><li>Noise and privacy drive hyper-local acceptance.</li><li>Medical payloads often get better public support than gadgets.</li></ul>",
            "<p><strong>Hook:</strong> The hardest part is not lifting a box—it is <strong>earning the right to fly over strangers’ yards every day.</strong></p>",
            faq("Is AI drone delivery fully autonomous?", "Usually partial: supervised autonomy with human oversight, geofencing, and contingency rules—terms vary by operator."),
            "<h2>SEO angle</h2><p>Cluster content: “<strong>drone delivery</strong>,” “<strong>autonomous UAS logistics</strong>,” and “<strong>FAA BVLOS waiver</strong>” capture different intents—cross-link them.</p>",
        ),
        "marketability_review": "Consumer curiosity + B2B logistics interest; video snippets help. Avoid overpromising timelines.",
        "readability_review": "Strong narrative arc; add subheads every ~200 words for mobile skimming.",
        "considerations": ["Use operator-specific examples only with permission.", "Noise studies add credibility."],
    },
    {
        "slug": "story-07-ai-drone-swarming-debate",
        "title": "AI, Drone Swarms, and Autonomy: Separating Headlines from Hardware Reality",
        "sub_heading": "Coordinated multi-UAS concepts push ethics and doctrine—here is a sober technical framing for instructors and students.",
        "hero_image": HERO,
        "seo_phrases": ["AI drone swarm", "autonomous weapons drones", "multi-UAV coordination", "military AI ethics", "UAS autonomy"],
        "body_html": block(
            "<p><strong>In short:</strong> “Swarm” and “AI drone” are overloaded terms. Real systems blend <strong>communications constraints</strong>, human oversight rules, and planning algorithms—often far from cinematic autonomy.</p>",
            "<h2>Key takeaways</h2><ul><li>Scale breaks naive coordination algorithms at low bandwidth.</li><li>EW makes links intermittent—designs must degrade gracefully.</li><li>Civil society pushes for clearer international norms; progress is uneven.</li></ul>",
            "<p><strong>Hook:</strong> Your students will ask about swarms—give them a framework: <strong>sensing, comms, autonomy level, and accountability.</strong></p>",
            faq("Are consumer drone light shows “swarms”?", "They are coordinated choreography—different reliability and safety case than contested military operations."),
            "<h2>Teaching responsibly</h2><p>Pair ethics discussion with FAA rules and professional codes. Highlight verification gaps in viral clips.</p>",
        ),
        "marketability_review": "High shareability; balance with sober disclaimers to protect brand trust for an education site.",
        "readability_review": "FAQ addresses misconceptions—good for snippet SEO and classroom use.",
        "considerations": ["Avoid sensational thumbnails.", "Link to ICRC or academic primers for ethics depth."],
    },
    {
        "slug": "story-08-maritime-underwater-drones",
        "title": "Maritime and Underwater Drones: USVs, Mine Warfare, and Naval Strategy",
        "sub_heading": "Uncrewed surface and subsurface systems are no longer niche experiments—here is why coastal and open-ocean risk models changed.",
        "hero_image": HERO,
        "seo_phrases": ["USV drone", "naval drone technology", "underwater autonomous vehicle", "maritime UAS", "drone boat surveillance"],
        "body_html": block(
            "<p><strong>In short:</strong> Uncrewed surface vessels and underwater vehicles featured in high-profile incidents and long-term doctrine shifts. <strong>Commercial-derived sensors and datalinks</strong> blur into naval missions.</p>",
            "<h2>Key takeaways</h2><ul><li>Surface drones can threaten high-value ships when targeting chains work.</li><li>Underwater comms and navigation remain hard; autonomy differs by class.</li><li>Environmental and escalation risks appear in public debate.</li></ul>",
            "<p><strong>Hook:</strong> The ocean is the next wide-open GUI for <strong>contested autonomy</strong>—with salt corrosion as an extra boss level.</p>",
            faq("Do Part 107 pilots operate USVs?", "Different regulatory regimes often apply; maritime law and coast guard rules matter—do not assume Part 107 alone."),
            "<figure style=\"margin:1.5rem 0;overflow-x:auto\"><svg viewBox=\"0 0 600 140\" xmlns=\"http://www.w3.org/2000/svg\" style=\"width:100%;height:auto\"><rect width=\"600\" height=\"140\" fill=\"#1a1a1a\" rx=\"4\"/><path d=\"M40 90 Q300 40 560 90\" stroke=\"#8ea66a\" fill=\"none\" stroke-width=\"2\"/><circle cx=\"120\" cy=\"68\" r=\"10\" fill=\"#525252\"/><circle cx=\"300\" cy=\"50\" r=\"10\" fill=\"#8ea66a\"/><circle cx=\"480\" cy=\"68\" r=\"10\" fill=\"#525252\"/><text x=\"300\" y=\"125\" text-anchor=\"middle\" fill=\"#888\" font-size=\"11\" font-family=\"system-ui\">Notional: surface ↔ air ↔ subsurface coordination</text></svg><figcaption>Illustrative diagram.</figcaption></figure>",
        ),
        "marketability_review": "Niche but strategic; pairs well with advanced course modules and policy readers.",
        "readability_review": "Visual breaks help dense topic; glossary of USV/UUV recommended in sidebar.",
        "considerations": ["Maritime imagery licensing can be costly—use abstract diagrams or stock."],
    },
    {
        "slug": "story-09-counter-uas-industry",
        "title": "Counter-UAS (C-UAS): Airports, Events, and the Business of Stopping Drones",
        "sub_heading": "Detection and defeat technologies scaled with the threat—under spectrum law and false-positive constraints.",
        "hero_image": HERO,
        "seo_phrases": ["counter drone system", "C-UAS airport", "drone jamming laws", "UAS detection radar", "anti-drone technology"],
        "body_html": block(
            "<p><strong>In short:</strong> C-UAS stacks combine radar, RF sensing, EO/IR, and defeat modes from jamming to nets. <strong>Civilian jamming legality</strong> varies; integration with ATC is non-trivial.</p>",
            "<h2>Key takeaways</h2><ul><li>False positives erode trust—tuning matters as much as range.</li><li>Defeat has collateral spectrum effects.</li><li>Market grew with high-profile incursions near airports and stadiums.</li></ul>",
            "<p><strong>Hook:</strong> Stopping a drone is a <strong>systems integration</strong> problem: policy, physics, and software—not a single silver-bullet gun.</p>",
            faq("Can I jam drones on my farm?", "Often illegal for civilians; can interfere with lawful communications—get jurisdiction-specific legal advice."),
            "<h2>SEO clusters</h2><p>Target “<strong>airport drone detection</strong>,” “<strong>stadium anti-drone</strong>,” and “<strong>C-UAS procurement</strong>” with separate landing pages over time.</p>",
        ),
        "marketability_review": "B2G and enterprise security interest; gated whitepapers work well. Consumer appeal limited.",
        "readability_review": "FAQ handles the dangerous legal question up front—good risk reduction.",
        "considerations": ["Never encourage illegal jamming.", "Vendor-neutral tone avoids alienating partners."],
    },
    {
        "slug": "story-10-europe-easa-drone-rules",
        "title": "European Drone Rules and EASA Frameworks: Classes, Risk, and Market Access",
        "sub_heading": "Harmonized UAS rules changed how manufacturers label aircraft and how pilots qualify—useful contrast for U.S. training audiences.",
        "hero_image": HERO,
        "seo_phrases": ["EASA drone regulations", "EU drone class mark", "UAS Open category Europe", "drone CE marking", "cross border drone operations"],
        "body_html": block(
            "<p><strong>In short:</strong> The EU’s risk-based categories (Open, Specific, Certified) tie operations to aircraft capabilities and pilot competency. <strong>Class marks</strong> influenced global SKUs.</p>",
            "<h2>Key takeaways</h2><ul><li>Harmonization helps manufacturers; pilots still face national nuances.</li><li>Training pathways differ from FAA Part 107—compare carefully in courses.</li><li>UK regimes diverged post-Brexit—verify current text.</li></ul>",
            "<p><strong>Hook:</strong> If you sell training online, your international students live under <strong>different default assumptions</strong>—make comparisons explicit.</p>",
            faq("Is Part 107 valid in the EU?", "Not automatically; operations follow local rules—treat as separate certification question."),
            "<h2>Structure for readability</h2><p>Use comparison tables sparingly; on mobile, stacked definition lists beat wide tables. If you must use tables, wrap in a scroll container in your layout component.</p>",
        ),
        "marketability_review": "Strong for international SEO and B2B training exports; pair with localization notes.",
        "readability_review": "Clear contrast narrative; add comparison table as downloadable PDF for desktop users.",
        "considerations": ["EASA updates—date the article.", "Verify UK CAA separately."],
    },
    {
        "slug": "advance-01-onboard-ml-computer-vision",
        "title": "Onboard AI and Computer Vision on Small Drones: From Obstacle Avoidance to Edge Inference",
        "sub_heading": "Why perception—not just motors—defines the next decade of UAS product roadmaps and FAA safety cases.",
        "hero_image": HERO,
        "seo_phrases": [
            "AI drone obstacle avoidance",
            "edge AI UAS",
            "computer vision drone",
            "autonomous drone perception",
            "neural network embedded drone",
        ],
        "body_html": block(
            "<p><strong>In short:</strong> Onboard machine learning moved drones from waypoint scripts to <strong>closed-loop perception</strong>: depth, segmentation, tracking, and fusion on embedded GPUs/NPUs—within strict power and thermal budgets.</p>",
            "<h2>Key takeaways</h2><ul><li>Watts matter as much as FLOPs for real missions.</li><li>Synthetic data and sim-to-real pipelines rival architecture tweaks.</li><li>Dual-use: inspection and agriculture vs. contested targeting discussions.</li><li>Better perception unlocks regulator confidence for advanced operations.</li></ul>",
            "<p><strong>Hook:</strong> The prettiest flight path means nothing if the aircraft cannot <strong>see</strong> the wire at the last second.</p>",
            faq("Are transformer models running on consumer drones yet?", "Efficient variants appear in research and premium stacks; mass-market adoption follows cost curves and certification evidence."),
            "<h2>SEO: what people search</h2><p>Queries blend “<strong>AI drone</strong>,” “<strong>obstacle avoidance</strong>,” and “<strong>autonomous flight</strong>.” Use natural language; avoid keyword stuffing.</p>",
            '<figure style="margin:1.5rem 0;overflow-x:auto"><img src="https://media.thedroneedge.com/articles/35/b411061e-6210-474f-a1b2-24dba585fd59.png" alt="Perception stack: sensors, fusion, planner, and actuation" style="width:100%;max-width:100%;height:auto;border-radius:4px" /><figcaption>Conceptual perception stack—not a vendor architecture.</figcaption></figure>',
            "<h2>Next advancement</h2><p>World models and lightweight multimodal reasoning on board, with certifiable behavior under distribution shift—expect incremental releases over several years.</p>",
        ),
        "marketability_review": "Strong evergreen SEO for tech-curious pilots; pairs with advanced modules on automation.",
        "readability_review": "Diagram breaks up jargon; FAQ hits common ML misconception.",
        "considerations": ["Update when major vendor ships new on-device stack.", "Clarify no training on export-controlled models."],
    },
    {
        "slug": "advance-02-swarm-coordination-autonomy",
        "title": "Swarms and Multi-UAV Autonomy: Algorithms Meet Radio Reality",
        "sub_heading": "Why “flock intelligence” is as much about links, jamming, and test harnesses as about clever math.",
        "hero_image": HERO,
        "seo_phrases": ["drone swarm technology", "multi-UAV autonomous systems", "distributed drone control", "UAS mesh network", "AI swarm drones"],
        "body_html": block(
            "<p><strong>In short:</strong> Multi-agent coordination research collided with <strong>bandwidth limits</strong> and EW. Useful swarms degrade gracefully when links drop—Hollywood rarely does.</p>",
            "<h2>Key takeaways</h2><ul><li>Scaling coordination is harder than demoing ten aircraft in a field.</li><li>Human-machine teaming interfaces matter for accountability.</li><li>Civilian light shows are not military-grade reliability.</li></ul>",
            "<p><strong>Hook:</strong> The hardest part of a swarm is not the swarm—it is the <strong>spectrum map</strong> around it.</p>",
            faq("Is this the same as AI drone swarms in movies?", "No. Operational systems emphasize constraints, fallbacks, and rules of engagement—when those exist."),
            "<h2>Marketability note</h2><p>Headlines oversell; your article wins by being <strong>technically grounded</strong> and classroom-ready.</p>",
        ),
        "marketability_review": "Moderate search volume; strong for differentiation as serious education brand.",
        "readability_review": "Short sections; add glossary for EW acronyms.",
        "considerations": ["Avoid classified-sounding claims.", "Neutral on specific militaries."],
    },
    {
        "slug": "advance-03-detect-avoid-bvlos",
        "title": "Detect-and-Avoid and BVLOS: The Sensor Stack Behind Real Drone Logistics",
        "sub_heading": "Why regulators care about false alarms as much as detection range—and what “airworthy” means for sensors.",
        "hero_image": HERO,
        "seo_phrases": ["BVLOS drone operations", "detect and avoid UAS", "drone ADS-B", "FAA BVLOS waiver", "UAS airspace integration"],
        "body_html": block(
            "<p><strong>In short:</strong> BVLOS unlocks economics for inspection and delivery, but requires <strong>evidence-grade</strong> DAA: fusion, track continuity, and acceptable false-alert rates in real weather.</p>",
            "<h2>Key takeaways</h2><ul><li>No single sensor covers all encounter geometries.</li><li>Urban clutter stresses every modality differently.</li><li>Policy timelines often lag hardware capability.</li></ul>",
            "<p><strong>Hook:</strong> BVLOS is less a firmware update and more a <strong>safety case binder</strong> you could drop on a desk—with footnotes.</p>",
            faq("Is BVLOS the same as autonomous flight?", "No. BVLOS is about permission to fly beyond sight; autonomy levels vary."),
            "<figure style=\"margin:1.5rem 0;overflow-x:auto\"><svg viewBox=\"0 0 580 200\" xmlns=\"http://www.w3.org/2000/svg\" style=\"width:100%;height:auto\"><rect width=\"580\" height=\"200\" fill=\"#1a1a1a\" rx=\"4\"/><circle cx=\"120\" cy=\"100\" r=\"40\" fill=\"none\" stroke=\"#8ea66a\" stroke-width=\"2\"/><circle cx=\"290\" cy=\"100\" r=\"40\" fill=\"none\" stroke=\"#737373\" stroke-width=\"2\"/><circle cx=\"460\" cy=\"100\" r=\"40\" fill=\"none\" stroke=\"#8ea66a\" stroke-width=\"2\"/><text x=\"290\" y=\"30\" text-anchor=\"middle\" fill=\"#c9c9c9\" font-size=\"12\" font-family=\"system-ui\">Fusion concept: multiple tracks → single picture</text></svg><figcaption>Illustrative.</figcaption></figure>",
        ),
        "marketability_review": "High B2B value; align CTAs to consultation or advanced pilot programs.",
        "readability_review": "Diagram supports scanning; consider step list for safety case.",
        "considerations": ["Cite ASTM/FAA references when going live.", "Update as rulemakings finalize."],
    },
    {
        "slug": "advance-04-gps-denied-navigation",
        "title": "GPS-Denied Flight: Visual-Inertial Navigation, SLAM, and the Future of Resilient Drones",
        "sub_heading": "When GNSS fails, autonomy stacks must keep working—here is how industry and defense approach the problem.",
        "hero_image": HERO,
        "seo_phrases": ["GPS denied navigation drone", "visual inertial odometry UAS", "drone anti-jamming", "alternative PNT drone", "SLAM drone mapping"],
        "body_html": block(
            "<p><strong>In short:</strong> Jamming and spoofing pushed investment in <strong>VIO/SLAM</strong>, terrain aids, and alternative PNT research. Small drones still face tight SWaP-C limits.</p>",
            "<h2>Key takeaways</h2><ul><li>IMU drift is inevitable; vision constraints differ by terrain and lighting.</li><li>Spoofing detection needs cross-checks, not vibes.</li><li>Operational hacks (tethers, presets) complement—not replace—navigation science.</li></ul>",
            "<p><strong>Hook:</strong> If your GPS icon flickers, your autonomy stack should not panic—your lesson plans should explain <strong>why</strong>.</p>",
            faq("Do Part 107 pilots need to understand SLAM?", "Conceptually helpful for advanced autonomy literacy—not exam-drill material for most beginners."),
            "<h2>Graph (conceptual)</h2><figure style=\"overflow-x:auto;margin:1rem 0\"><svg viewBox=\"0 0 500 160\" xmlns=\"http://www.w3.org/2000/svg\" style=\"width:100%;height:auto\"><rect width=\"500\" height=\"160\" fill=\"#1a1a1a\" rx=\"4\"/><polyline points=\"40,120 120,90 200,100 280,70 360,85 440,60\" fill=\"none\" stroke=\"#8ea66a\" stroke-width=\"2\"/><text x=\"250\" y=\"28\" text-anchor=\"middle\" fill=\"#c9c9c9\" font-size=\"11\" font-family=\"system-ui\">Illustrative: error growth without GNSS (not measured data)</text></svg><figcaption>Not empirical—pedagogical only.</figcaption></figure>",
        ),
        "marketability_review": "Niche technical SEO; attracts advanced students and defense-adjacent readers.",
        "readability_review": "Good for readers who already know Part 107 basics; link prerequisites.",
        "considerations": ["Avoid implying consumer drones are EW-proof.", "Label illustrative charts clearly."],
    },
    {
        "slug": "advance-05-energy-propulsion",
        "title": "Batteries, Motors, and Endurance: The Physics Ceiling on Electric Drones",
        "sub_heading": "AI cannot cheat thermodynamics—why energy storage still gates mission profiles for multicopters and eVTOL adjacent designs.",
        "hero_image": HERO,
        "seo_phrases": ["drone battery technology", "UAS endurance", "electric drone propulsion", "Li-ion drone flight time", "eVTOL battery energy density"],
        "body_html": block(
            "<p><strong>In short:</strong> Chemistry advances moved slower than Moore’s law. Mission planners optimize paths; hardware teams fight for <strong>grams</strong> and cooling.</p>",
            "<h2>Key takeaways</h2><ul><li>Specific energy dominates headlines; pack engineering dominates reality.</li><li>Hybrid and tethering fill niches, not universals.</li><li>Thermal limits affect fast charging on hot ramps.</li></ul>",
            "<p><strong>Hook:</strong> Every sensor gram steals flight time—your <strong>integration discipline</strong> is as important as your battery brand.</p>",
            faq("Will solid-state batteries double drone flight time overnight?", "Unlikely uniformly—manufacturing yield, safety testing, and aviation certification set the pace."),
            "<figure style=\"margin:1.5rem 0;overflow-x:auto\"><svg viewBox=\"0 0 520 180\" xmlns=\"http://www.w3.org/2000/svg\" style=\"width:100%;height:auto\"><rect width=\"520\" height=\"180\" fill=\"#1a1a1a\" rx=\"4\"/><rect x=\"60\" y=\"60\" width=\"80\" height=\"90\" fill=\"#404040\"/><rect x=\"160\" y=\"45\" width=\"80\" height=\"105\" fill=\"#8ea66a\"/><rect x=\"260\" y=\"55\" width=\"80\" height=\"95\" fill=\"#525252\"/><rect x=\"360\" y=\"50\" width=\"80\" height=\"100\" fill=\"#404040\"/><text x=\"260\" y=\"32\" text-anchor=\"middle\" fill=\"#c9c9c9\" font-size=\"12\" font-family=\"system-ui\">Illustrative: mission energy budget categories</text></svg><figcaption>Conceptual bars—not measurements.</figcaption></figure>",
            "<h2>AI connection</h2><p>Power-aware planning and contingency routing are active research areas—<strong>software squeezes waste</strong> when cells cannot squeeze more joules yet.</p>",
        ),
        "marketability_review": "Cross-audience: hobbyists want flight time; engineers want charts—serve both with layers (summary + deep link).",
        "readability_review": "Clear physics framing; chart aids shareability on social.",
        "considerations": ["Update when major cell chemistry shifts ship at scale.", "Avoid naming unverifiable energy densities."],
    },
]

# story-11-drone-careers.json is hand-maintained (full narrative + sector figures).
HAND_MAINTAINED_SLUGS = {"story-11-drone-careers"}

SEO_MARKER = "Topics & related search terms"


def merge_seo_into_body(body_html: str, phrases: list) -> str:
    if not phrases:
        return body_html
    if SEO_MARKER in body_html:
        return body_html
    parts = ", ".join(f"<strong>{html.escape(str(p))}</strong>" for p in phrases)
    block = f'<h2>{SEO_MARKER}</h2>\n<p>Topics and queries covered in this piece: {parts}.</p>'
    return body_html.rstrip() + "\n\n" + block


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for a in ARTICLES:
        slug = a["slug"]
        path = OUT / f"{slug}.json"
        if slug in HAND_MAINTAINED_SLUGS and path.exists():
            out = json.loads(path.read_text(encoding="utf-8"))
            manifest.append({"slug": slug, "title": out["title"], "hero_image": out["hero_image"]})
            print(f"{path} (hand-maintained, skipped)")
            continue
        out = dict(a)
        if out.get("body_html") and out.get("seo_phrases"):
            out["body_html"] = merge_seo_into_body(out["body_html"], out["seo_phrases"])
        path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        manifest.append({"slug": slug, "title": a["title"], "hero_image": a["hero_image"]})
        print(path)
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(OUT / "manifest.json")


if __name__ == "__main__":
    main()
