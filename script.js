const nav = document.querySelector("[data-nav]");
const utterances = Array.from(document.querySelectorAll(".utterance"));
const form = document.querySelector(".access-form");
const formStatus = document.querySelector(".form-status");
const accessModal = document.querySelector("[data-access-modal]");
const accessModalTriggers = Array.from(document.querySelectorAll("[data-open-access-modal]"));
const accessModalCloseButtons = Array.from(document.querySelectorAll("[data-close-access-modal]"));
const languageButtons = Array.from(document.querySelectorAll("[data-lang]"));
const appTabs = Array.from(document.querySelectorAll("[data-app-tab]"));
const appPanels = Array.from(document.querySelectorAll("[data-app-panel]"));
const dealRows = Array.from(document.querySelectorAll("[data-deal-name]"));
const backToDealsButton = document.querySelector("[data-app-back]");
const detailName = document.querySelector("[data-detail-name]");
const detailMeta = document.querySelector("[data-detail-meta]");
const detailStatus = document.querySelector("[data-detail-status]");
const openAskButton = document.querySelector("[data-open-ask]");
const askEmpty = document.querySelector("[data-ask-empty]");
const askMessages = document.querySelector("[data-ask-messages]");
const askPromptButtons = Array.from(document.querySelectorAll("[data-ask-prompt]"));
const askInput = document.querySelector(".ask-input");
const askTextInput = document.querySelector("[data-ask-input]");
const motionHero = document.querySelector("[data-motion-hero]");
let selectedDealName = "Al Noor Bank";
let selectedDealRow = null;
let thinkingTimer = null;
let lastFocusedElement = null;

const SUPABASE_URL = "https://vriofvpoagfnlmrbepkm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ztm-q3VrZeqqABxCp1b-sQ_jBA-Me9Y";
const EARLY_ACCESS_TABLE = "early_access_requests";
const REQUEST_SOURCE = "sadha_landing";
const LANGUAGE_STORAGE_KEY = "sadha-language";
const THANK_YOU_PAGE = "thank-you.html";

const translations = {
  en: {
    "meta.title": "SADHA | Conversations Into CRM, Automatically",
    "meta.description":
      "SADHA captures Zoom, Google Meet, and WhatsApp sales conversations, turns them into usable AI intelligence, and syncs everything directly to your CRM.",
    "meta.socialDescription": "Calls and WhatsApp become structured CRM intelligence—automatically.",
    "nav.homeLabel": "SADHA home",
    "nav.languageLabel": "Language",
    "nav.features": "What you get",
    "nav.security": "Product",
    "nav.enterprise": "Why SADHA",
    "nav.cta": "Get Early Access",
    "hero.stream1": "بس نحتاج data residency قبل التوقيع",
    "hero.stream2": "Pricing needs procurement clarity",
    "hero.stream3": "Can we include Dubai legal next week?",
    "hero.engine": "SADHA NLP",
    "hero.output1": "Deal risk: Data residency",
    "hero.output2": "Commitment: Compliance workshop",
    "hero.output3": "CRM: Close date updated",
    "hero.eyebrow": "Calls + WhatsApp → CRM",
    "hero.titleMuted": "Every conversation.",
    "hero.titleStrong": "In your CRM.",
    "hero.subhead":
      "SADHA transcribes calls, understands WhatsApp, and updates your CRM automatically.",
    "hero.primary": "Get Early Access",
    "hero.secondary": "See it in action",
    "hero.microcopy": "Built for sales teams where the deal lives in WhatsApp.",
    "heroVisual.live": "Live deal signals",
    "heroVisual.meetSignal": "VP Finance confirmed the budget.",
    "heroVisual.meetMeta": "09:42 · transcript",
    "heroVisual.whatsappMeta": "10:18 · buyer message",
    "heroVisual.resultTitle": "Deal record updated automatically.",
    "heroVisual.resultText": "Risk flagged · Next step added · Close date updated",
    "heroVisual.sources": "sources connected",
    "heroVisual.manual": "manual fields",
    "heroVisual.confidence": "sync confidence",
    "heroVisual.chats": "Chats captured",
    "heroVisual.calls": "Calls transcribed",
    "heroVisual.understands": "Understands and structures",
    "heroVisual.crmUpdated": "CRM updated automatically",
    "heroVisual.crmFields": "Notes · risks · next steps",
    "heroVisual.whatsappSignal": "Need KSA data residency",
    "heroVisual.meetSignalShort": "Budget confirmed",
    "heroVisual.zoomSignal": "4 action items",
    "motionDashboard.label": "Unified deal record",
    "motionDashboard.synced": "Synced to CRM",
    "motionDashboard.insight": "Risk flagged · Next step added",
    "integrations.label": "Connects the tools your team already uses",
    "productPreview.label": "The complete deal record",
    "productPreview.title": "See what your CRM was missing.",
    "productPreview.text":
      "Calls, WhatsApp, risks, commitments, and next steps — connected to the right opportunity and ready to act on.",
    "pipeline.capture": "Conversations",
    "pipeline.understand": "SADHA AI",
    "pipeline.sync": "CRM",
    "pipeline.live": "Live",
    "pipeline.whatsappTitle": "WhatsApp",
    "pipeline.whatsapp": "buyer chats and voice notes",
    "pipeline.zoomTitle": "Zoom",
    "pipeline.zoom": "sales calls and demos",
    "pipeline.meetTitle": "Google Meet",
    "pipeline.meet": "discovery and follow-ups",
    "pipeline.engine": "SADHA AI",
    "pipeline.summaries": "Summaries",
    "pipeline.risks": "Deal risks",
    "pipeline.nextSteps": "Next steps",
    "pipeline.crmRecord": "CRM record",
    "pipeline.synced": "CRM updated",
    "pipeline.meetingSummary": "Meeting summary",
    "pipeline.decisionRisk": "Decision risk",
    "pipeline.followUp": "Next follow-up",
    "pipeline.truthText": "Notes · risks · next steps",
    "app.nav.deals": "Deals",
    "app.nav.ask": "Ask Sadha",
    "app.nav.analytics": "Analytics",
    "app.connected": "Connected",
    "app.connected.whatsapp": "WhatsApp Business",
    "app.connected.meet": "Google Meet",
    "app.connected.zoom": "Zoom",
    "app.connected.hubspot": "HubSpot",
    "app.user.role": "Head of Sales",
    "app.deals.title": "Deals",
    "app.deals.subtitle":
      "Every call and WhatsApp message, understood and synced to the right CRM record.",
    "app.deals.pipeline": "Pipeline: SAR 2.9M · 4 open",
    "app.location.riyadh": "Riyadh, KSA",
    "app.location.dubai": "Dubai, UAE",
    "app.location.cairo": "Cairo, Egypt",
    "app.location.amman": "Amman, Jordan",
    "app.location.jeddah": "Jeddah, KSA",
    "app.location.doha": "Doha, Qatar",
    "app.stage.negotiation": "Negotiation",
    "app.stage.proposal": "Proposal",
    "app.stage.discovery": "Discovery",
    "app.stage.qualification": "Qualification",
    "app.stage.closedLost": "Closed Lost",
    "app.stage.closedWon": "Closed Won",
    "app.health.riskCompliance": "At risk — compliance",
    "app.health.healthy": "Healthy",
    "app.health.quiet16": "Quiet 16 days",
    "app.health.quiet14": "Quiet 14 days",
    "app.health.pricingBudget": "Pricing / budget",
    "app.health.won": "Won",
    "app.channel.whatsapp2d": "WhatsApp · 2d ago",
    "app.channel.meetYesterday": "Meet · yesterday",
    "app.channel.zoom16d": "Zoom · 16d ago",
    "app.channel.whatsapp14d": "WhatsApp · 14d ago",
    "app.channel.whatsapp31d": "WhatsApp · 31d ago",
    "app.channel.crmSynced": "CRM · synced",
    "app.detail.back": "← All deals",
    "app.detail.timeline": "Unified timeline",
    "app.detail.whatsappTag": "WhatsApp",
    "app.detail.whatsappMeta":
      "Buyer Khalid · Tue 14:02 · flagged compliance blocker",
    "app.detail.meetTag": "Meet",
    "app.detail.meetText":
      "60-min expansion review — 3 pricing objections, VP Finance moved from observer to decision path. Competitor mention: Clari.",
    "app.detail.meetMeta": "Wed 10:00 · full transcript · 4 action items",
    "app.detail.zoomTag": "Zoom",
    "app.detail.zoomText":
      "Procurement asked for staged CAPEX pricing and the security whitepaper.",
    "app.detail.zoomMeta": "Thu 09:14 · full transcript · pricing objection captured",
    "app.detail.crmTag": "CRM",
    "app.detail.crmText": "Stage → Negotiation. Close date auto-updated to Aug 15.",
    "app.detail.crmMeta": "Synced to HubSpot · confidence 94%",
    "app.detail.summaryLabel": "Sadha summary",
    "app.detail.summaryText":
      "Data residency inside KSA is the sole blocker. Buyer is otherwise committed — VP Finance joined the decision path last call. Compliance pack was promised and has not been sent.",
    "app.detail.nextSteps": "Next steps",
    "app.detail.step1": "Send Saudi data isolation brief to CIO",
    "app.detail.step2": "Book Dubai compliance workshop",
    "app.detail.step3": "Confirm revised procurement quote",
    "app.detail.askButton": "Ask Sadha about this deal",
    "app.ask.title": "Ask Sadha",
    "app.ask.subtitle":
      "Ask anything about your deals in English or Arabic. Every answer cites the call, chat, and CRM record behind it.",
    "app.ask.emptyTitle": "Start with a revenue question.",
    "app.ask.emptyText":
      "Sadha will answer from Zoom, Meet, WhatsApp, and CRM records with sources attached.",
    "app.ask.promptBlocking": "What’s blocking {deal}?",
    "app.ask.answerBlocking":
      "{deal} is blocked by the highest-risk commitment in its timeline. Sadha found it by connecting WhatsApp, Zoom, Meet, and CRM movement into one deal record.",
    "app.ask.sourcesBlocking": "sources: unified timeline · WhatsApp · CRM",
    "app.ask.promptQuiet": "Which Q2 deals went quiet?",
    "app.ask.answerQuiet":
      "Three deals have had no contact in 14+ days: Nile Logistics, Petra Foods, and Marjan Hospitality. Two also have unanswered WhatsApp messages from the buyer.",
    "app.ask.sourcesQuiet": "sources: CRM activity · WhatsApp Business · Zoom",
    "app.ask.promptLeak": "Where is the funnel leaking?",
    "app.ask.answerLeak":
      "The biggest drop-off is Proposal → Negotiation. Compliance/data-residency and late pricing revisions appear in most stalled opportunities at that stage.",
    "app.ask.sourcesLeak": "sources: Q3 funnel · 11 calls · 23 chats",
    "app.ask.promptLost": "Why did we lose Gulf Retail Co.?",
    "app.ask.answerLost":
      "Pricing was raised in 4 of 6 touchpoints. On the Mar 12 call the buyer said the quote was above budget, and no revised offer was ever sent.",
    "app.ask.sourcesLost": "sources: Meet Mar 12 · WhatsApp Mar 18 · CRM closed-lost note",
    "app.ask.placeholder": "Ask about any deal, reason, or number...",
    "app.ask.button": "Ask",
    "app.ask.thinking": "Sadha is reading the pipeline",
    "app.ask.defaultAnswer":
      "Sadha would answer this by checking every call and WhatsApp message tied to the deal, then citing the CRM updates behind the recommendation.",
    "app.ask.defaultSources": "sources: connected revenue timeline",
    "app.analytics.title": "Analytics",
    "app.analytics.subtitle": "This quarter, across all channels.",
    "app.analytics.funnel": "Funnel — Q3",
    "app.analytics.funnel1": "9 deals · SAR 4.4M",
    "app.analytics.funnel2": "7 deals · SAR 3.6M",
    "app.analytics.funnel3": "5 deals · SAR 2.4M",
    "app.analytics.funnel4": "2 deals · SAR 1.0M",
    "app.analytics.funnel5": "1 deal · SAR 0.4M",
    "app.analytics.dropoff": "Biggest drop-off: Proposal → Negotiation (-58%). Ask Sadha why →",
    "app.analytics.lostReasons": "Top lost reasons",
    "app.analytics.dataResidency": "Data residency",
    "app.analytics.noNextStep": "No next step",
    "app.analytics.competitorPressure": "Competitor pressure",
    "app.analytics.insightLabel": "Sadha insight",
    "app.analytics.insightText":
      "Deals where compliance is answered before week 3 closed 2.1× more often. Two open deals are past that window.",
    "dashboard.label": "Meeting Intelligence",
    "dashboard.account": "Al Noor Bank / Expansion Review",
    "dashboard.health": "Deal Health: At Risk",
    "dashboard.summaryLabel": "Signal summary",
    "dashboard.summaryTitle": "60-minute call, reduced to accountable revenue movement.",
    "dashboard.metric1": "Rep:Client talk ratio",
    "dashboard.metric2": "Pricing objections",
    "dashboard.metric3": "CRM fields mapped",
    "dashboard.signal1": "Saudi data residency surfaced as approval blocker",
    "dashboard.signal2": "Competitor mention detected: Clari",
    "dashboard.signal3": "VP Finance moved from observer to decision path",
    "timeline.label": "Transcript intelligence",
    "timeline.title": "Regional code-switching timeline",
    "timeline.rep": "Rep",
    "timeline.client": "Client",
    "timeline.u1":
      "We can align the rollout with your Q3 Majlis review, inshallah.",
    "timeline.u2": "بس نحتاج data residency داخل السعودية قبل ما نوقّع.",
    "timeline.u3":
      "Understood. Pricing can be staged if procurement needs CAPEX clarity.",
    "timeline.u4":
      "خلونا نشوف pilot مع compliance and the Dubai team next week.",
    "actions.label": "AI action items",
    "actions.item1": "Send Saudi isolation brief to CIO",
    "actions.item2": "Book Dubai compliance workshop",
    "actions.item3": "Update Salesforce close date",
    "actions.confidence": "CRM sync confidence",
    "problem.title": "Two blind spots are costing you pipeline.",
    "problem.eyebrow": "Why CRM data breaks",
    "problem.card1Label": "01 / Calls",
    "problem.card1Title": "Calls become memory. Memory becomes CRM.",
    "problem.card1Text":
      "After every call, reps decide what to remember, what to log, and what to skip. Your forecast inherits every omission.",
    "problem.callEnded": "Call ended",
    "problem.fromMemory": "from memory",
    "problem.crmUpdate": "Incomplete CRM",
    "problem.dialect1": "60-min call",
    "problem.dialect2": "4 CRM fields",
    "problem.dialect3": "1 missed blocker",
    "problem.dialect4": "Rep memory",
    "problem.card2Label": "02 / WhatsApp",
    "problem.card2Title": "The real deal never reaches CRM.",
    "problem.card2Text":
      "Pricing, objections, approvals, and commitments live in chat. Without SADHA, managers never see the full buying journey.",
    "problem.chat1": "Need procurement approval today",
    "problem.chat3": "Risk: procurement approval",
    "problem.chatNext": "Next step: send revised price",
    "problem.card3Label": "The fix",
    "problem.card3Title": "Capture every conversation. Update every deal.",
    "problem.card3Text":
      "SADHA connects calls and WhatsApp to the right opportunity, then writes structured intelligence directly into your CRM.",
    "problem.summary": "Calls",
    "problem.commitment": "WhatsApp",
    "problem.crmFields": "CRM updated",
    "problem.hubspot": "HubSpot",
    "problem.salesforce": "Salesforce",
    "features.xrayLabel": "Know every deal",
    "features.xrayTitle": "Managers see the truth without chasing reps.",
    "features.xrayText":
      "Review a 60-minute call in 60 seconds. See objections, commitments, pricing pressure, and who owes the next step.",
    "features.panel1Label": "Call X-Ray",
    "features.panel1Badge": "60s review",
    "features.metric1": "Rep talk time",
    "features.metric2": "Client talk time",
    "features.metric3": "Pricing flags",
    "features.metric4": "Competitors",
    "features.summaryLabel": "Ask the pipeline",
    "features.summaryTitle": "Answers with receipts, not opinions.",
    "features.summaryText":
      "Lost reasons, funnel drop-off, competitor mentions, promises made on a call three weeks ago. Ask in plain English or Arabic and get the answer with receipts.",
    "features.panel2Label": "Pipeline intelligence",
    "features.panel2Badge": "With receipts",
    "features.askQuestion1": "Why did we lose Gulf Retail Co.?",
    "features.askAnswer1":
      "Pricing was raised in 4 of 6 touchpoints. On the Mar 12 call the buyer said “السعر أعلى من الميزانية” and no revised quote was ever sent.",
    "features.askQuestion2": "Which Q2 deals went quiet?",
    "features.askAnswer2":
      "3 deals have had no contact in 14+ days: Al Noor Bank, Nile Logistics, and Petra Foods. Two have unanswered WhatsApp messages from the buyer.",
    "features.ourCommitments": "Our Commitments",
    "features.our1": "Send SDAIA compliance pack",
    "features.our2": "Share phased pricing model",
    "features.our3": "Confirm Arabic NLP pilot scope",
    "features.theirCommitments": "Their Commitments",
    "features.their1": "Introduce CIO and legal counsel",
    "features.their2": "Provide procurement timeline",
    "features.their3": "Confirm Dubai workshop attendees",
    "security.label": "Enterprise trust and security",
    "security.title": "Bank-grade controls for conversations that cannot leak.",
    "security.metric1Value": "Private",
    "security.metric1Label": "Tenant isolation",
    "security.metric2Label": "At-rest encryption",
    "security.metric3Label": "Regional deployment paths",
    "access.label": "Ready to fix your CRM data?",
    "access.title": "Stop managing deals from half the story.",
    "access.modalTitle": "Get early access",
    "access.modalText": "Enter your work email and we’ll send you the private preview details.",
    "access.nameLabel": "Name",
    "access.namePlaceholder": "Your name",
    "access.emailLabel": "Corporate email",
    "access.placeholder": "name@company.com",
    "access.button": "Get Early Access",
    "access.submitting": "Submitting...",
    "access.closeLabel": "Close early access form",
    "status.supabaseMissing": "Supabase project URL is missing.",
    "status.duplicate": "Request already received. We'll be in touch soon.",
    "status.success": "Request received. We'll be in touch soon.",
    "status.error": "Something went wrong. Please try again.",
    "footer.contact": "Contact",
    "footer.copy": "Copyright 2026 SADHA Intelligence. All rights reserved.",
  },
  ar: {
    "meta.title": "صدى | كل محادثة مبيعات، متزامنة مع إدارة العملاء",
    "meta.description":
      "يلتقط صدى محادثات المبيعات في زوم وجوجل ميت وواتساب، ويحوّلها إلى معلومات قابلة للاستخدام بالذكاء الاصطناعي، ثم يزامنها مباشرة مع نظام إدارة العملاء.",
    "meta.socialDescription":
      "المكالمات وواتساب تتحول تلقائيا إلى معلومات منظمة داخل إدارة العملاء.",
    "nav.homeLabel": "العودة إلى الصفحة الرئيسية لصدى",
    "nav.languageLabel": "اختيار اللغة",
    "nav.features": "ما تحصل عليه",
    "nav.security": "المنتج",
    "nav.enterprise": "لماذا صدى",
    "nav.cta": "احصل على وصول مبكر",
    "hero.stream1": "بس نحتاج إقامة البيانات قبل التوقيع",
    "hero.stream2": "التسعير يحتاج وضوحا للمشتريات",
    "hero.stream3": "هل نضيف الفريق القانوني في دبي الأسبوع القادم؟",
    "hero.engine": "معالجة اللغة في صدى",
    "hero.output1": "خطر الصفقة: إقامة البيانات",
    "hero.output2": "التزام: ورشة امتثال",
    "hero.output3": "إدارة العملاء: تحديث تاريخ الإغلاق",
    "hero.eyebrow": "المكالمات + واتساب ← إدارة العملاء",
    "hero.titleMuted": "كل محادثة.",
    "hero.titleStrong": "داخل إدارة العملاء.",
    "hero.subhead":
      "يفرغ صدى المكالمات ويفهم واتساب ويحدث إدارة العملاء تلقائيا.",
    "hero.primary": "احصل على وصول مبكر",
    "hero.secondary": "شاهد المنتج",
    "hero.microcopy": "مصمم لفرق المبيعات التي تعيش صفقاتها في واتساب.",
    "heroVisual.live": "إشارات الصفقة المباشرة",
    "heroVisual.meetSignal": "أكد نائب رئيس المالية الميزانية.",
    "heroVisual.meetMeta": "09:42 · النص الكامل",
    "heroVisual.whatsappMeta": "10:18 · رسالة المشتري",
    "heroVisual.resultTitle": "تم تحديث سجل الصفقة تلقائيا.",
    "heroVisual.resultText": "رصد الخطر · إضافة الخطوة التالية · تحديث تاريخ الإغلاق",
    "heroVisual.sources": "مصدران متصلان",
    "heroVisual.manual": "حقول يدوية",
    "heroVisual.confidence": "ثقة المزامنة",
    "heroVisual.chats": "التقاط المحادثات",
    "heroVisual.calls": "تفريغ المكالمات",
    "heroVisual.understands": "يفهم وينظم",
    "heroVisual.crmUpdated": "تحديث إدارة العملاء تلقائيا",
    "heroVisual.crmFields": "ملاحظات · مخاطر · خطوات تالية",
    "heroVisual.whatsappSignal": "نحتاج إقامة البيانات في السعودية",
    "heroVisual.meetSignalShort": "تم تأكيد الميزانية",
    "heroVisual.zoomSignal": "4 مهام",
    "motionDashboard.label": "سجل الصفقة الموحد",
    "motionDashboard.synced": "متزامن مع إدارة العملاء",
    "motionDashboard.insight": "رصد الخطر · إضافة الخطوة التالية",
    "integrations.label": "يتصل بالأدوات التي يستخدمها فريقك بالفعل",
    "productPreview.label": "سجل الصفقة الكامل",
    "productPreview.title": "شاهد ما كانت تفوته إدارة العملاء.",
    "productPreview.text":
      "المكالمات وواتساب والمخاطر والالتزامات والخطوات التالية — مرتبطة بالفرصة الصحيحة وجاهزة للتنفيذ.",
    "pipeline.capture": "المحادثات",
    "pipeline.understand": "ذكاء صدى",
    "pipeline.sync": "إدارة العملاء",
    "pipeline.live": "مباشر",
    "pipeline.whatsappTitle": "واتساب",
    "pipeline.whatsapp": "محادثات المشتري والرسائل الصوتية",
    "pipeline.zoomTitle": "زوم",
    "pipeline.zoom": "مكالمات المبيعات والعروض",
    "pipeline.meetTitle": "جوجل ميت",
    "pipeline.meet": "الاكتشاف والمتابعات",
    "pipeline.engine": "ذكاء صدى",
    "pipeline.summaries": "الملخصات",
    "pipeline.risks": "مخاطر الصفقة",
    "pipeline.nextSteps": "الخطوات التالية",
    "pipeline.crmRecord": "سجل إدارة العملاء",
    "pipeline.synced": "تم تحديث إدارة العملاء",
    "pipeline.meetingSummary": "ملخص الاجتماع",
    "pipeline.decisionRisk": "مخاطر القرار",
    "pipeline.followUp": "المتابعة التالية",
    "pipeline.truthText": "ملاحظات · مخاطر · خطوات تالية",
    "app.nav.deals": "الصفقات",
    "app.nav.ask": "اسأل صدى",
    "app.nav.analytics": "التحليلات",
    "app.connected": "متصل",
    "app.connected.whatsapp": "واتساب للأعمال",
    "app.connected.meet": "جوجل ميت",
    "app.connected.zoom": "زوم",
    "app.connected.hubspot": "هاب سبوت",
    "app.user.role": "رئيس المبيعات",
    "app.deals.title": "الصفقات",
    "app.deals.subtitle":
      "كل مكالمة ورسالة واتساب، مفهومة ومتزامنة مع سجل الصفقة الصحيح.",
    "app.deals.pipeline": "خط المبيعات: 2.9M SAR · 4 مفتوحة",
    "app.location.riyadh": "الرياض، السعودية",
    "app.location.dubai": "دبي، الإمارات",
    "app.location.cairo": "القاهرة، مصر",
    "app.location.amman": "عمّان، الأردن",
    "app.location.jeddah": "جدة، السعودية",
    "app.location.doha": "الدوحة، قطر",
    "app.stage.negotiation": "تفاوض",
    "app.stage.proposal": "عرض",
    "app.stage.discovery": "اكتشاف",
    "app.stage.qualification": "تأهيل",
    "app.stage.closedLost": "خسرت",
    "app.stage.closedWon": "ربحت",
    "app.health.riskCompliance": "في خطر — الامتثال",
    "app.health.healthy": "سليمة",
    "app.health.quiet16": "صامتة 16 يوما",
    "app.health.quiet14": "صامتة 14 يوما",
    "app.health.pricingBudget": "التسعير / الميزانية",
    "app.health.won": "ربحت",
    "app.channel.whatsapp2d": "واتساب · قبل يومين",
    "app.channel.meetYesterday": "اجتماع · أمس",
    "app.channel.zoom16d": "زوم · قبل 16 يوما",
    "app.channel.whatsapp14d": "واتساب · قبل 14 يوما",
    "app.channel.whatsapp31d": "واتساب · قبل 31 يوما",
    "app.channel.crmSynced": "إدارة العملاء · تمت المزامنة",
    "app.detail.back": "→ كل الصفقات",
    "app.detail.timeline": "الخط الزمني الموحد",
    "app.detail.whatsappTag": "واتساب",
    "app.detail.whatsappMeta": "المشتري خالد · الثلاثاء 14:02 · عائق امتثال مرصود",
    "app.detail.meetTag": "اجتماع",
    "app.detail.meetText":
      "مراجعة توسع لمدة 60 دقيقة — 3 اعتراضات على التسعير، وانتقال نائب المالية إلى مسار القرار. ذُكر منافس: Clari.",
    "app.detail.meetMeta": "الأربعاء 10:00 · النص الكامل · 4 مهام",
    "app.detail.zoomTag": "زوم",
    "app.detail.zoomText":
      "طلبت المشتريات تسعيرا مرحليا لـ CAPEX والورقة البيضاء الأمنية.",
    "app.detail.zoomMeta": "الخميس 09:14 · النص الكامل · رصد اعتراض على التسعير",
    "app.detail.crmTag": "إدارة العملاء",
    "app.detail.crmText": "المرحلة ← تفاوض. تم تحديث تاريخ الإغلاق إلى 15 أغسطس.",
    "app.detail.crmMeta": "تمت المزامنة مع هاب سبوت · الثقة 94%",
    "app.detail.summaryLabel": "ملخص صدى",
    "app.detail.summaryText":
      "إقامة البيانات داخل السعودية هي العائق الوحيد. المشتري ملتزم بخلاف ذلك — انضم نائب المالية إلى مسار القرار في آخر مكالمة. وُعدت حزمة الامتثال ولم تُرسل بعد.",
    "app.detail.nextSteps": "الخطوات التالية",
    "app.detail.step1": "إرسال موجز عزل البيانات السعودي إلى مدير التقنية",
    "app.detail.step2": "حجز ورشة امتثال في دبي",
    "app.detail.step3": "تأكيد عرض المشتريات المعدل",
    "app.detail.askButton": "اسأل صدى عن هذه الصفقة",
    "app.ask.title": "اسأل صدى",
    "app.ask.subtitle":
      "اسأل عن صفقاتك بالعربية أو الإنجليزية. كل إجابة تستشهد بالمكالمة والمحادثة وسجل إدارة العملاء.",
    "app.ask.emptyTitle": "ابدأ بسؤال عن الإيرادات.",
    "app.ask.emptyText":
      "ستجيب صدى من زوم وجوجل ميت وواتساب وإدارة علاقات العملاء مع المصادر.",
    "app.ask.promptBlocking": "ما الذي يعيق {deal}؟",
    "app.ask.answerBlocking":
      "{deal} متوقفة عند أعلى التزام خطورة في خطها الزمني. ربطت صدى واتساب وزوم وجوجل ميت وحركة إدارة علاقات العملاء في سجل صفقة واحد للوصول إلى السبب.",
    "app.ask.sourcesBlocking": "المصادر: الخط الزمني الموحد · واتساب · إدارة العملاء",
    "app.ask.promptQuiet": "أي صفقات في الربع الثاني أصبحت صامتة؟",
    "app.ask.answerQuiet":
      "ثلاث صفقات لم يحدث معها تواصل منذ أكثر من 14 يوما: Nile Logistics وPetra Foods وMarjan Hospitality. واثنتان لديهما رسائل واتساب غير مجابة من المشتري.",
    "app.ask.sourcesQuiet": "المصادر: نشاط إدارة العملاء · واتساب للأعمال · زوم",
    "app.ask.promptLeak": "أين يتسرب القمع؟",
    "app.ask.answerLeak":
      "أكبر انخفاض يحدث من العرض إلى التفاوض. تظهر مسائل الامتثال وإقامة البيانات وتأخر تعديلات التسعير في معظم الفرص المتوقفة في هذه المرحلة.",
    "app.ask.sourcesLeak": "المصادر: قمع Q3 · 11 مكالمة · 23 محادثة",
    "app.ask.promptLost": "لماذا خسرنا Gulf Retail Co.؟",
    "app.ask.answerLost":
      "تم رفع موضوع التسعير في 4 من أصل 6 نقاط تواصل. في مكالمة 12 مارس قال المشتري إن العرض فوق الميزانية، ولم يتم إرسال عرض معدل.",
    "app.ask.sourcesLost": "المصادر: اجتماع 12 مارس · واتساب 18 مارس · ملاحظة إدارة العملاء",
    "app.ask.placeholder": "اسأل عن أي صفقة أو سبب أو رقم...",
    "app.ask.button": "اسأل",
    "app.ask.thinking": "تقرأ صدى خط المبيعات",
    "app.ask.defaultAnswer":
      "ستجيب صدى عبر فحص كل مكالمة ورسالة واتساب مرتبطة بالصفقة، ثم تذكر تحديثات إدارة العملاء التي تدعم التوصية.",
    "app.ask.defaultSources": "المصادر: خط الإيرادات المتصل",
    "app.analytics.title": "التحليلات",
    "app.analytics.subtitle": "هذا الربع، عبر كل القنوات.",
    "app.analytics.funnel": "القمع — Q3",
    "app.analytics.funnel1": "9 صفقات · SAR 4.4M",
    "app.analytics.funnel2": "7 صفقات · SAR 3.6M",
    "app.analytics.funnel3": "5 صفقات · SAR 2.4M",
    "app.analytics.funnel4": "صفقتان · SAR 1.0M",
    "app.analytics.funnel5": "صفقة واحدة · SAR 0.4M",
    "app.analytics.dropoff": "أكبر انخفاض: العرض ← التفاوض (-58%). اسأل صدى عن السبب ←",
    "app.analytics.lostReasons": "أهم أسباب الخسارة",
    "app.analytics.dataResidency": "إقامة البيانات",
    "app.analytics.noNextStep": "لا خطوة تالية",
    "app.analytics.competitorPressure": "ضغط المنافسين",
    "app.analytics.insightLabel": "رؤية صدى",
    "app.analytics.insightText":
      "الصفقات التي يتم فيها الرد على الامتثال قبل الأسبوع الثالث تُغلق بمعدل أعلى 2.1×. صفقتان مفتوحتان تجاوزتا هذه النافذة.",
    "dashboard.label": "ذكاء الاجتماعات",
    "dashboard.account": "بنك النور / مراجعة التوسع",
    "dashboard.health": "صحة الصفقة: في خطر",
    "dashboard.summaryLabel": "ملخص الإشارات",
    "dashboard.summaryTitle": "مكالمة من 60 دقيقة تتحول إلى حركة إيرادات قابلة للمساءلة.",
    "dashboard.metric1": "نسبة حديث المندوب إلى العميل",
    "dashboard.metric2": "اعتراضات على التسعير",
    "dashboard.metric3": "حقول إدارة العملاء مطابقة",
    "dashboard.signal1": "إقامة البيانات في السعودية ظهرت كعائق للموافقة",
    "dashboard.signal2": "رصد ذكر منافس: Clari",
    "dashboard.signal3": "نائب رئيس المالية انتقل من مراقب إلى مسار القرار",
    "timeline.label": "ذكاء النص التفريغي",
    "timeline.title": "خط زمني للتنقل اللغوي الإقليمي",
    "timeline.rep": "المندوب",
    "timeline.client": "العميل",
    "timeline.u1": "يمكننا مواءمة الإطلاق مع مراجعة المجلس للربع الثالث، إن شاء الله.",
    "timeline.u2": "بس نحتاج إقامة البيانات داخل السعودية قبل ما نوقّع.",
    "timeline.u3": "واضح. يمكن تقسيم التسعير إذا احتاجت المشتريات وضوحا في CAPEX.",
    "timeline.u4": "خلونا نشوف تجربة مع فريق الامتثال وفريق دبي الأسبوع القادم.",
    "actions.label": "مهام الذكاء الاصطناعي",
    "actions.item1": "إرسال موجز عزل البيانات السعودي إلى مدير تقنية المعلومات",
    "actions.item2": "حجز ورشة امتثال في دبي",
    "actions.item3": "تحديث تاريخ الإغلاق في سيلزفورس",
    "actions.confidence": "ثقة مزامنة إدارة العملاء",
    "problem.title": "نقطتان عمياء تكلفانك صفقات.",
    "problem.eyebrow": "لماذا تفشل بيانات إدارة العملاء",
    "problem.card1Label": "01 / المكالمات",
    "problem.card1Title": "المكالمات تصبح ذاكرة. والذاكرة تصبح بيانات.",
    "problem.card1Text":
      "بعد كل مكالمة، يقرر المندوب ما يتذكره وما يسجله وما يتجاهله. توقعاتك ترث كل معلومة مفقودة.",
    "problem.callEnded": "انتهت المكالمة",
    "problem.fromMemory": "من الذاكرة",
    "problem.crmUpdate": "سجل غير مكتمل",
    "problem.dialect1": "مكالمة 60 دقيقة",
    "problem.dialect2": "4 حقول CRM",
    "problem.dialect3": "عائق واحد مفقود",
    "problem.dialect4": "ذاكرة المندوب",
    "problem.card2Label": "02 / واتساب",
    "problem.card2Title": "الصفقة الحقيقية لا تصل إلى إدارة العملاء.",
    "problem.card2Text":
      "التسعير والاعتراضات والموافقات والالتزامات تعيش في المحادثات. بدون صدى، لا يرى المديرون رحلة الشراء كاملة.",
    "problem.chat1": "نحتاج موافقة المشتريات اليوم",
    "problem.chat3": "الخطر: موافقة المشتريات",
    "problem.chatNext": "الخطوة التالية: إرسال السعر المعدل",
    "problem.card3Label": "الحل",
    "problem.card3Title": "التقط كل محادثة. حدث كل صفقة.",
    "problem.card3Text":
      "يربط صدى المكالمات وواتساب بالفرصة الصحيحة، ثم يكتب المعلومات المنظمة مباشرة داخل إدارة العملاء.",
    "problem.summary": "المكالمات",
    "problem.commitment": "واتساب",
    "problem.crmFields": "تم تحديث إدارة العملاء",
    "problem.hubspot": "هاب سبوت",
    "problem.salesforce": "سيلزفورس",
    "features.xrayLabel": "اعرف كل صفقة",
    "features.xrayTitle": "يرى المديرون الحقيقة دون ملاحقة المندوبين.",
    "features.xrayText":
      "راجع مكالمة من 60 دقيقة خلال 60 ثانية. شاهد الاعتراضات والالتزامات وضغط التسعير ومن يملك الخطوة التالية.",
    "features.panel1Label": "تحليل المكالمة",
    "features.panel1Badge": "مراجعة 60 ثانية",
    "features.metric1": "وقت حديث المندوب",
    "features.metric2": "وقت حديث العميل",
    "features.metric3": "إشارات التسعير",
    "features.metric4": "منافسون",
    "features.summaryLabel": "اسأل خط المبيعات",
    "features.summaryTitle": "إجابات بالأدلة، لا بالآراء.",
    "features.summaryText":
      "أسباب الخسارة، انخفاض القمع، ذكر المنافسين، والوعود التي قيلت في مكالمة قبل ثلاثة أسابيع. اسأل بالعربية أو الإنجليزية واحصل على الإجابة مع الدليل.",
    "features.panel2Label": "ذكاء خط المبيعات",
    "features.panel2Badge": "مع الدليل",
    "features.askQuestion1": "لماذا خسرنا Gulf Retail Co.؟",
    "features.askAnswer1":
      "تمت مناقشة السعر في 4 من أصل 6 نقاط تواصل. في مكالمة 12 مارس قال المشتري “السعر أعلى من الميزانية” ولم يتم إرسال عرض معدل.",
    "features.askQuestion2": "أي صفقات في الربع الثاني أصبحت صامتة؟",
    "features.askAnswer2":
      "3 صفقات لم يحدث معها أي تواصل منذ أكثر من 14 يوما: Al Noor Bank وNile Logistics وPetra Foods. صفقتان لديهما رسائل واتساب غير مجابة من المشتري.",
    "features.ourCommitments": "التزاماتنا",
    "features.our1": "إرسال حزمة امتثال SDAIA",
    "features.our2": "مشاركة نموذج تسعير مرحلي",
    "features.our3": "تأكيد نطاق تجربة معالجة العربية",
    "features.theirCommitments": "التزاماتهم",
    "features.their1": "تعريف مدير التقنية والمستشار القانوني",
    "features.their2": "تزويد جدول المشتريات الزمني",
    "features.their3": "تأكيد حضور ورشة دبي",
    "security.label": "الثقة والأمان للمؤسسات",
    "security.title": "ضوابط بمستوى البنوك للمحادثات التي لا يجوز أن تتسرب.",
    "security.metric1Value": "خاص",
    "security.metric1Label": "عزل لكل مستأجر",
    "security.metric2Label": "تشفير البيانات المخزنة",
    "security.metric3Label": "مسارات نشر إقليمية",
    "access.label": "جاهز لإصلاح بيانات إدارة العملاء؟",
    "access.title": "توقف عن إدارة الصفقات بنصف القصة.",
    "access.modalTitle": "احصل على وصول مبكر",
    "access.modalText": "أدخل بريد العمل وسنرسل لك تفاصيل المعاينة الخاصة.",
    "access.nameLabel": "الاسم",
    "access.namePlaceholder": "اسمك",
    "access.emailLabel": "البريد الإلكتروني للشركة",
    "access.placeholder": "name@company.com",
    "access.button": "احصل على وصول مبكر",
    "access.submitting": "جار الإرسال...",
    "access.closeLabel": "إغلاق نموذج الوصول المبكر",
    "status.supabaseMissing": "رابط مشروع Supabase غير موجود.",
    "status.duplicate": "وصلنا طلبك سابقا. سنتواصل معك قريبا.",
    "status.success": "تم استلام الطلب. سنتواصل معك قريبا.",
    "status.error": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    "footer.contact": "تواصل معنا",
    "footer.copy": "حقوق النشر 2026 صدى. جميع الحقوق محفوظة.",
  },
};

const supportedLanguages = Object.keys(translations);
let currentLanguage = "en";

const t = (key) => {
  if (Object.prototype.hasOwnProperty.call(translations[currentLanguage], key)) {
    return translations[currentLanguage][key];
  }

  return translations.en[key] || key;
};

const tFormat = (key, replacements = {}) =>
  Object.entries(replacements).reduce(
    (value, [token, replacement]) => value.replaceAll(`{${token}}`, replacement),
    t(key)
  );

const getStoredLanguage = () => {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
};

const setStoredLanguage = (language) => {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Browsers can disable storage; language still works for the current visit.
  }
};

const getSystemLanguage = () => {
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  return languages.some((language) => language?.toLowerCase().startsWith("ar"))
    ? "ar"
    : "en";
};

const getInitialLanguage = () => {
  const storedLanguage = getStoredLanguage();

  if (supportedLanguages.includes(storedLanguage)) {
    return storedLanguage;
  }

  return getSystemLanguage();
};

const setMetaContent = (selector, value) => {
  const element = document.querySelector(selector);

  if (element) {
    element.setAttribute("content", value);
  }
};

const applyLanguage = (language, { persist = false } = {}) => {
  if (!supportedLanguages.includes(language)) {
    return;
  }

  currentLanguage = language;
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = t(element.dataset.i18n);
    element.textContent = value;

    if (element.hasAttribute("data-hide-parent-when-empty")) {
      element.parentElement.hidden = value === "";
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });

  languageButtons.forEach((button) => {
    const isActive = button.dataset.lang === language;
    button.setAttribute("aria-pressed", String(isActive));
  });

  document.title = t("meta.title");
  setMetaContent('meta[name="description"]', t("meta.description"));
  setMetaContent('meta[property="og:title"]', t("meta.title"));
  setMetaContent('meta[property="og:description"]', t("meta.socialDescription"));
  setMetaContent('meta[name="twitter:title"]', t("meta.title"));
  setMetaContent('meta[name="twitter:description"]', t("meta.socialDescription"));

  if (formStatus?.dataset.statusKey) {
    formStatus.textContent = t(formStatus.dataset.statusKey);
  }

  const submitButton = form?.querySelector("button");
  if (submitButton && !submitButton.disabled) {
    submitButton.textContent = t("access.button");
  }

  window.syncSadhaDashboardLanguage?.();

  if (persist) {
    setStoredLanguage(language);
  }
};

const setNavState = () => {
  nav?.classList.toggle("is-scrolled", window.scrollY > 12);
};

let activeIndex = 0;
let transcriptCycle = null;
const cycleTranscript = () => {
  if (!utterances.length) {
    return;
  }

  utterances[activeIndex].classList.remove("active");
  activeIndex = (activeIndex + 1) % utterances.length;
  utterances[activeIndex].classList.add("active");
};

const setActiveUtterance = (index) => {
  if (!utterances.length) {
    return;
  }

  utterances[activeIndex].classList.remove("active");
  activeIndex = index;
  utterances[activeIndex].classList.add("active");
};

const startTranscriptCycle = () => {
  if (utterances.length) {
    transcriptCycle = window.setInterval(cycleTranscript, 2400);
  }
};

const stopTranscriptCycle = () => {
  window.clearInterval(transcriptCycle);
};

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.lang, { persist: true });
  });
});

window.addEventListener("scroll", setNavState, { passive: true });
setNavState();
applyLanguage(getInitialLanguage());
startTranscriptCycle();

utterances.forEach((utterance, index) => {
  utterance.addEventListener("pointerenter", () => {
    stopTranscriptCycle();
    setActiveUtterance(index);
  });

  utterance.addEventListener("pointerleave", () => {
    stopTranscriptCycle();
    startTranscriptCycle();
  });
});

const showAppPanel = (panelName) => {
  appTabs.forEach((tab) => {
    const activePanel = panelName === "deal" ? "deals" : panelName;
    tab.classList.toggle("active", tab.dataset.appTab === activePanel);
  });

  appPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.appPanel === panelName);
  });
};

const updateDealDetail = (row) => {
  selectedDealRow = row;
  selectedDealName = row.dataset.dealName;
  const location = row.querySelector(".deal-company small")?.textContent.trim() || "";
  const valueNode = row.querySelector(".deal-value");
  const valueCurrency = valueNode?.querySelector("strong")?.textContent.trim() || "";
  const valueAmount =
    Array.from(valueNode?.childNodes || [])
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .join(" ")
      .trim() || "";
  const value = [valueCurrency, valueAmount].filter(Boolean).join(" ");
  const stage = row.querySelector(".stage-pill")?.textContent.trim() || "";
  const status = row.querySelector(".health-pill");

  detailName.textContent = selectedDealName;
  detailMeta.textContent = [location, value, stage].filter(Boolean).join(" · ");
  detailStatus.textContent = status?.textContent.trim() || "";
  detailStatus.className = status?.className || "health-pill";

  if (status?.dataset.i18n) {
    detailStatus.dataset.i18n = status.dataset.i18n;
  } else {
    delete detailStatus.dataset.i18n;
  }

  syncAskPromptButtons();
};

const clearThinking = () => {
  window.clearTimeout(thinkingTimer);
  askMessages?.querySelector(".ask-thinking")?.remove();
};

const appendAskMessage = (className, text, sources = "") => {
  const message = document.createElement("article");
  message.className = className;

  if (className === "ask-ai-message") {
    const copy = document.createElement("p");
    copy.textContent = text;
    message.append(copy);

    if (sources) {
      const sourceLine = document.createElement("span");
      sourceLine.textContent = sources;
      message.append(sourceLine);
    }
  } else {
    message.textContent = text;
  }

  askMessages.append(message);
  askEmpty?.setAttribute("hidden", "");
};

const syncAskPromptButtons = () => {
  askPromptButtons.forEach((button) => {
    const promptKey = button.dataset.askPromptKey;

    if (!promptKey) {
      return;
    }

    const prompt = tFormat(promptKey, { deal: selectedDealName });
    const answer = button.dataset.askAnswerKey
      ? tFormat(button.dataset.askAnswerKey, { deal: selectedDealName })
      : "";
    const sources = button.dataset.askSourcesKey ? t(button.dataset.askSourcesKey) : "";

    button.textContent = prompt;
    button.dataset.askPrompt = prompt;
    button.dataset.askAnswer = answer;
    button.dataset.askSources = sources;
  });
};

const askSadha = ({ prompt, answer, sources }) => {
  if (!askMessages || !prompt) {
    return;
  }

  clearThinking();
  appendAskMessage("ask-user-message", prompt);
  appendAskMessage("ask-thinking", t("app.ask.thinking"));

  thinkingTimer = window.setTimeout(() => {
    clearThinking();
    appendAskMessage(
      "ask-ai-message",
      answer || t("app.ask.defaultAnswer"),
      sources || t("app.ask.defaultSources")
    );
  }, 850);
};

const openAskForSelectedDeal = () => {
  showAppPanel("ask");
  askTextInput?.focus();
};

appTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showAppPanel(tab.dataset.appTab);
  });
});

dealRows.forEach((row) => {
  row.addEventListener("click", () => {
    updateDealDetail(row);
    showAppPanel("deal");
  });
});

backToDealsButton?.addEventListener("click", () => {
  showAppPanel("deals");
});

openAskButton?.addEventListener("click", openAskForSelectedDeal);

askPromptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    askSadha({
      prompt: button.dataset.askPrompt,
      answer: button.dataset.askAnswer,
      sources: button.dataset.askSources,
    });
  });
});

askInput?.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = askTextInput.value.trim();

  if (!prompt) {
    askTextInput.focus();
    return;
  }

  askSadha({ prompt });
  askTextInput.value = "";
});

window.syncSadhaDashboardLanguage = () => {
  if (
    selectedDealRow &&
    document.querySelector('[data-app-panel="deal"]')?.classList.contains("active")
  ) {
    updateDealDetail(selectedDealRow);
    return;
  }

  syncAskPromptButtons();
};

syncAskPromptButtons();

const trackEvent = (eventName, parameters = {}) => {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, parameters);
  }
};

const openAccessModal = () => {
  if (!accessModal) {
    return;
  }

  lastFocusedElement = document.activeElement;
  accessModal.hidden = false;
  document.body.classList.add("is-modal-open");
  setFormStatus("");

  window.requestAnimationFrame(() => {
    accessModal.classList.add("is-open");
    form?.querySelector('[name="email"]')?.focus();
  });
};

const closeAccessModal = () => {
  if (!accessModal) {
    return;
  }

  accessModal.classList.remove("is-open");
  document.body.classList.remove("is-modal-open");
  setFormStatus("");

  window.setTimeout(() => {
    accessModal.hidden = true;
    lastFocusedElement?.focus?.();
  }, 180);
};

accessModalTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    const location = trigger.closest(".hero-copy")
      ? "hero"
      : trigger.closest(".access-card")
        ? "final_cta"
        : trigger.closest(".nav")
          ? "navigation"
          : "footer";
    trackEvent("early_access_cta_click", { cta_location: location });
    openAccessModal();
  });
});

accessModalCloseButtons.forEach((button) => {
  button.addEventListener("click", closeAccessModal);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && accessModal?.classList.contains("is-open")) {
    closeAccessModal();
  }
});

const setFormStatus = (messageKey = "", tone = "") => {
  if (!formStatus) {
    return;
  }

  formStatus.dataset.statusKey = messageKey;
  formStatus.textContent = messageKey ? t(messageKey) : "";
  formStatus.classList.toggle("is-success", tone === "success");
  formStatus.classList.toggle("is-error", tone === "error");
};

const setSubmitting = (button, isSubmitting) => {
  button.disabled = isSubmitting;
  button.textContent = t(isSubmitting ? "access.submitting" : "access.button");
};

const redirectToThankYou = (email) => {
  const params = new URLSearchParams({
    email,
    lang: currentLanguage,
  });

  window.location.href = `${THANK_YOU_PAGE}?${params.toString()}`;
};

const submitEarlyAccess = async ({ name, email, button, formElement }) => {
  const endpoint = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${EARLY_ACCESS_TABLE}`;
  const payload = {
    email,
    source: REQUEST_SOURCE,
    page_path: window.location.pathname,
  };

  if (name) {
    payload.full_name = name;
  }

  const postSignup = (body) =>
    fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
    });

  setSubmitting(button, true);
  setFormStatus("");

  try {
    let response = await postSignup(payload);

    if (!response.ok && response.status === 400 && payload.full_name) {
      const { full_name, ...emailOnlyPayload } = payload;
      response = await postSignup(emailOnlyPayload);
    }

    if (response.status === 409) {
      formElement.reset();
      redirectToThankYou(email);
      return;
    }

    if (!response.ok) {
      throw new Error(`Supabase insert failed with ${response.status}`);
    }

    formElement.reset();
    trackEvent("generate_lead", {
      lead_source: REQUEST_SOURCE,
      transport_type: "beacon",
    });
    redirectToThankYou(email);
  } catch (error) {
    console.error(error);
    setFormStatus("status.error", "error");
  } finally {
    setSubmitting(button, false);
  }
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = form.querySelector('[name="email"]');
  const button = form.querySelector("button");
  const name = "";
  const email = input.value.trim().toLowerCase();

  if (!email) {
    input.focus();
    form.reportValidity();
    return;
  }

  if (!SUPABASE_URL) {
    setFormStatus("status.supabaseMissing", "error");
    return;
  }

  submitEarlyAccess({ name, email, button, formElement: form });
});

let heroMotionFrame = null;

const clampMotion = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const updateHeroMotion = () => {
  heroMotionFrame = null;

  if (!motionHero) {
    return;
  }

  const staticLayout =
    window.innerWidth <= 1060 ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (staticLayout) {
    motionHero.style.setProperty("--hero-progress", "0");
    motionHero.style.setProperty("--float-opacity", "1");
    motionHero.style.setProperty("--dashboard-progress", "0");
    motionHero.style.setProperty("--dashboard-y", "34px");
    motionHero.style.setProperty("--copy-opacity", "1");
    motionHero.style.setProperty("--copy-y", "0px");
    return;
  }

  const rect = motionHero.getBoundingClientRect();
  const travel = Math.max(motionHero.offsetHeight - window.innerHeight, 1);
  const progress = clampMotion(-rect.top / travel);
  const dashboardProgress = clampMotion((progress - 0.3) / 0.44);
  const floatOpacity = clampMotion(1 - progress * 1.65);

  motionHero.style.setProperty("--hero-progress", progress.toFixed(3));
  motionHero.style.setProperty("--float-opacity", floatOpacity.toFixed(3));
  motionHero.style.setProperty(
    "--dashboard-progress",
    dashboardProgress.toFixed(3),
  );
  motionHero.style.setProperty(
    "--dashboard-y",
    `${((1 - dashboardProgress) * 34).toFixed(1)}px`,
  );
  motionHero.style.setProperty(
    "--copy-opacity",
    (1 - dashboardProgress * 0.25).toFixed(3),
  );
  motionHero.style.setProperty("--copy-y", `${(-18 * progress).toFixed(1)}px`);
  motionHero.style.setProperty("--whatsapp-x", `${(170 * progress).toFixed(1)}px`);
  motionHero.style.setProperty("--whatsapp-y", `${(-105 * progress).toFixed(1)}px`);
  motionHero.style.setProperty("--meet-x", `${(25 * progress).toFixed(1)}px`);
  motionHero.style.setProperty("--meet-y", `${(155 * progress).toFixed(1)}px`);
  motionHero.style.setProperty("--zoom-x", `${(-165 * progress).toFixed(1)}px`);
  motionHero.style.setProperty("--zoom-y", `${(28 * progress).toFixed(1)}px`);
  motionHero.style.setProperty("--sadha-x", `${(0 * progress).toFixed(1)}px`);
  motionHero.style.setProperty("--sadha-y", `${(38 * progress).toFixed(1)}px`);
  motionHero.style.setProperty("--crm-x", `${(-118 * progress).toFixed(1)}px`);
  motionHero.style.setProperty("--crm-y", `${(-120 * progress).toFixed(1)}px`);
};

const requestHeroMotionUpdate = () => {
  if (!heroMotionFrame) {
    heroMotionFrame = window.requestAnimationFrame(updateHeroMotion);
  }
};

window.addEventListener("scroll", requestHeroMotionUpdate, { passive: true });
window.addEventListener("resize", requestHeroMotionUpdate);
requestHeroMotionUpdate();
