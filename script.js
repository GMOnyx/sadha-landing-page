const nav = document.querySelector("[data-nav]");
const utterances = Array.from(document.querySelectorAll(".utterance"));
const form = document.querySelector(".access-form");
const formStatus = document.querySelector(".form-status");
const languageButtons = Array.from(document.querySelectorAll("[data-lang]"));

const SUPABASE_URL = "https://vriofvpoagfnlmrbepkm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ztm-q3VrZeqqABxCp1b-sQ_jBA-Me9Y";
const EARLY_ACCESS_TABLE = "early_access_requests";
const REQUEST_SOURCE = "sadha_landing";
const LANGUAGE_STORAGE_KEY = "sadha-language";

const translations = {
  en: {
    "meta.title": "SADHA | Revenue Intelligence for MENA",
    "meta.description":
      "SADHA is an enterprise revenue intelligence platform built for multi-lingual B2B sales teams across MENA.",
    "meta.socialDescription": "The Revenue intelligence software built for MENA.",
    "nav.homeLabel": "SADHA home",
    "nav.languageLabel": "Language",
    "nav.features": "Features",
    "nav.security": "Security",
    "nav.enterprise": "Enterprise",
    "nav.cta": "Request Early Access",
    "hero.stream1": "بس نحتاج data residency قبل التوقيع",
    "hero.stream2": "Pricing needs procurement clarity",
    "hero.stream3": "Can we include Dubai legal next week?",
    "hero.engine": "SADHA NLP",
    "hero.output1": "Deal risk: Data residency",
    "hero.output2": "Commitment: Compliance workshop",
    "hero.output3": "CRM: Close date updated",
    "hero.eyebrow": "SADHA meeting intelligence",
    "hero.titleMuted": "The Revenue intelligence",
    "hero.titleStrong": "software built for MENA",
    "hero.subhead": "English-Arabic sales calls, decoded into revenue actions.",
    "hero.primary": "Request Early Access",
    "hero.secondary": "View Intelligence",
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
    "problem.title": "Western platforms hear the words. Sadha understands the market.",
    "problem.eyebrow": "Why regional teams need native intelligence",
    "problem.card1Label": "The dialect gap",
    "problem.card1Title": "The Code-Switching Nightmare.",
    "problem.card1Text":
      "Western transcription fails when sales reps fluidly mix Khaleeji, Levantine, or Egyptian Arabic with English. Sadha decodes it natively.",
    "problem.dialect1": "Khaleeji",
    "problem.dialect2": "Levantine",
    "problem.dialect3": "Egyptian",
    "problem.dialect4": "English",
    "problem.card2Label": "Data sovereignty",
    "problem.card2Title": "Strict Regional Compliance.",
    "problem.card2Text":
      "Built to align with regional data residency frameworks such as Saudi Arabia's NDMO/SDAIA laws. Local data infrastructure for local enterprises.",
    "problem.card3Label": "CRM friction",
    "problem.card3Title": "Zero-Click CRM Logging.",
    "problem.card3Text":
      "Sadha automatically maps call summaries, customer commitments, and next steps straight into HubSpot and Salesforce.",
    "problem.summary": "Summary",
    "features.xrayLabel": "Manager visibility",
    "features.xrayTitle": "The X-Ray Call Timeline.",
    "features.xrayText":
      "Scan a 60-minute meeting in 60 seconds. Sadha turns every sales call into a readable signal map for talk ratios, pricing pressure, risks, and competitor mentions.",
    "features.panel1Label": "Call X-Ray",
    "features.panel1Badge": "60s review",
    "features.metric1": "Rep talk time",
    "features.metric2": "Client talk time",
    "features.metric3": "Pricing flags",
    "features.metric4": "Competitors",
    "features.summaryLabel": "Executive-ready output",
    "features.summaryTitle": "The Post-Call Executive Summary.",
    "features.summaryText":
      "Every stakeholder leaves with a clean record of what was promised, by whom, and when. Sadha separates your obligations from customer commitments before the deal memory fades.",
    "features.panel2Label": "Auto-generated after 42 seconds",
    "features.panel2Badge": "Push to CRM",
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
    "access.label": "Private enterprise preview",
    "access.title": "Bring absolute visibility to your regional pipeline.",
    "access.emailLabel": "Corporate email",
    "access.placeholder": "name@company.com",
    "access.button": "Request Early Access",
    "access.submitting": "Submitting...",
    "status.supabaseMissing": "Supabase project URL is missing.",
    "status.duplicate": "Request already received. We'll be in touch soon.",
    "status.success": "Request received. We'll be in touch soon.",
    "status.error": "Something went wrong. Please try again.",
    "footer.contact": "Contact",
    "footer.copy": "Copyright 2026 SADHA Intelligence. All rights reserved.",
  },
  ar: {
    "meta.title": "SADHA | ذكاء الإيرادات للشرق الأوسط وشمال أفريقيا",
    "meta.description":
      "SADHA منصة ذكاء إيرادات للمؤسسات، مصممة لفرق المبيعات متعددة اللغات في الشرق الأوسط وشمال أفريقيا.",
    "meta.socialDescription":
      "منصة ذكاء الإيرادات المصممة للشرق الأوسط وشمال أفريقيا.",
    "nav.homeLabel": "العودة إلى الصفحة الرئيسية لـ SADHA",
    "nav.languageLabel": "اختيار اللغة",
    "nav.features": "المزايا",
    "nav.security": "الأمان",
    "nav.enterprise": "للمؤسسات",
    "nav.cta": "اطلب الوصول المبكر",
    "hero.stream1": "بس نحتاج إقامة البيانات قبل التوقيع",
    "hero.stream2": "التسعير يحتاج وضوحا للمشتريات",
    "hero.stream3": "هل نضيف الفريق القانوني في دبي الأسبوع القادم؟",
    "hero.engine": "معالجة اللغة في SADHA",
    "hero.output1": "خطر الصفقة: إقامة البيانات",
    "hero.output2": "التزام: ورشة امتثال",
    "hero.output3": "CRM: تحديث تاريخ الإغلاق",
    "hero.eyebrow": "SADHA لذكاء الاجتماعات",
    "hero.titleMuted": "صدى",
    "hero.titleStrong": "منصة تحول المكالمات إلى إجراءات إيرادات واضحة",
    "hero.subhead": "",
    "hero.primary": "اطلب الوصول المبكر",
    "hero.secondary": "شاهد الذكاء",
    "dashboard.label": "ذكاء الاجتماعات",
    "dashboard.account": "بنك النور / مراجعة التوسع",
    "dashboard.health": "صحة الصفقة: في خطر",
    "dashboard.summaryLabel": "ملخص الإشارات",
    "dashboard.summaryTitle": "مكالمة من 60 دقيقة تتحول إلى حركة إيرادات قابلة للمساءلة.",
    "dashboard.metric1": "نسبة حديث المندوب إلى العميل",
    "dashboard.metric2": "اعتراضات على التسعير",
    "dashboard.metric3": "حقول CRM مطابقة",
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
    "actions.item3": "تحديث تاريخ الإغلاق في Salesforce",
    "actions.confidence": "ثقة مزامنة CRM",
    "problem.title": "المنصات الغربية تسمع الكلمات. SADHA يفهم السوق.",
    "problem.eyebrow": "لماذا تحتاج الفرق الإقليمية إلى ذكاء محلي",
    "problem.card1Label": "فجوة اللهجات",
    "problem.card1Title": "معضلة التنقل بين اللغات.",
    "problem.card1Text":
      "تتعثر أدوات التفريغ الغربية عندما يمزج مندوبو المبيعات بين الخليجي أو الشامي أو المصري والإنجليزية بسلاسة. SADHA يفك هذا السياق محليا.",
    "problem.dialect1": "خليجي",
    "problem.dialect2": "شامي",
    "problem.dialect3": "مصري",
    "problem.dialect4": "إنجليزي",
    "problem.card2Label": "سيادة البيانات",
    "problem.card2Title": "امتثال إقليمي صارم.",
    "problem.card2Text":
      "مصمم ليتماشى مع أطر إقامة البيانات الإقليمية مثل لوائح NDMO/SDAIA في السعودية. بنية بيانات محلية لمؤسسات محلية.",
    "problem.card3Label": "احتكاك CRM",
    "problem.card3Title": "تسجيل CRM بلا نقرات.",
    "problem.card3Text":
      "يربط SADHA ملخصات المكالمات، والتزامات العملاء، والخطوات التالية مباشرة داخل HubSpot وSalesforce.",
    "problem.summary": "الملخص",
    "features.xrayLabel": "رؤية للمديرين",
    "features.xrayTitle": "خط زمني شفاف للمكالمة.",
    "features.xrayText":
      "راجع اجتماعا من 60 دقيقة خلال 60 ثانية. يحول SADHA كل مكالمة مبيعات إلى خريطة إشارات واضحة لنسب الحديث، وضغط التسعير، والمخاطر، وذكر المنافسين.",
    "features.panel1Label": "تحليل المكالمة",
    "features.panel1Badge": "مراجعة 60 ثانية",
    "features.metric1": "وقت حديث المندوب",
    "features.metric2": "وقت حديث العميل",
    "features.metric3": "إشارات التسعير",
    "features.metric4": "منافسون",
    "features.summaryLabel": "مخرجات جاهزة للإدارة",
    "features.summaryTitle": "ملخص تنفيذي بعد المكالمة.",
    "features.summaryText":
      "يغادر كل صاحب مصلحة بسجل واضح لما وُعد به، ومن المسؤول عنه، ومتى يجب تنفيذه. يفصل SADHA التزاماتكم عن التزامات العميل قبل أن تتلاشى ذاكرة الصفقة.",
    "features.panel2Label": "مولد تلقائيا بعد 42 ثانية",
    "features.panel2Badge": "إرسال إلى CRM",
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
    "access.label": "معاينة خاصة للمؤسسات",
    "access.title": "امنح خط مبيعاتك الإقليمي رؤية كاملة.",
    "access.emailLabel": "البريد الإلكتروني للشركة",
    "access.placeholder": "name@company.com",
    "access.button": "اطلب الوصول المبكر",
    "access.submitting": "جار الإرسال...",
    "status.supabaseMissing": "رابط مشروع Supabase غير موجود.",
    "status.duplicate": "وصلنا طلبك سابقا. سنتواصل معك قريبا.",
    "status.success": "تم استلام الطلب. سنتواصل معك قريبا.",
    "status.error": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    "footer.contact": "تواصل معنا",
    "footer.copy": "حقوق النشر 2026 SADHA Intelligence. جميع الحقوق محفوظة.",
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

const submitEarlyAccess = async ({ email, button, input }) => {
  const endpoint = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${EARLY_ACCESS_TABLE}`;

  setSubmitting(button, true);
  setFormStatus("");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        email,
        source: REQUEST_SOURCE,
        page_path: window.location.pathname,
      }),
    });

    if (response.status === 409) {
      input.value = "";
      setFormStatus("status.duplicate", "success");
      return;
    }

    if (!response.ok) {
      throw new Error(`Supabase insert failed with ${response.status}`);
    }

    input.value = "";
    setFormStatus("status.success", "success");
  } catch (error) {
    console.error(error);
    setFormStatus("status.error", "error");
  } finally {
    setSubmitting(button, false);
  }
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = form.querySelector("input");
  const button = form.querySelector("button");
  const email = input.value.trim().toLowerCase();

  if (!email) {
    input.focus();
    return;
  }

  if (!SUPABASE_URL) {
    setFormStatus("status.supabaseMissing", "error");
    return;
  }

  submitEarlyAccess({ email, button, input });
});
