const mobileStickyCta = document.querySelector("[data-mobile-sticky]");
const mobileHeroCta = document.querySelector(".mobile-hero [data-demo-cta]");
const mobileFinalCta = document.querySelector(".final-section [data-demo-cta]");
const mobileDemoModal = document.querySelector("[data-demo-modal]");
const revealSections = Array.from(document.querySelectorAll("[data-reveal]"));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let heroCtaVisible = true;
let finalCtaVisible = false;

const syncStickyCta = () => {
  if (!mobileStickyCta) {
    return;
  }

  const modalOpen = mobileDemoModal?.classList.contains("is-open");
  mobileStickyCta.classList.toggle(
    "is-visible",
    !heroCtaVisible && !finalCtaVisible && !modalOpen,
  );
};

if (typeof window.gtag === "function") {
  window.gtag("event", "mobile_landing_view", {
    landing_variant: "mobile_v1",
    page_path: window.location.pathname,
  });
}

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealSections.forEach((section) => section.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12%", threshold: 0.12 },
  );

  revealSections.forEach((section) => revealObserver.observe(section));
}

if (mobileStickyCta && mobileHeroCta && "IntersectionObserver" in window) {
  const ctaObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target === mobileHeroCta) {
          heroCtaVisible = entry.isIntersecting;
        }

        if (entry.target === mobileFinalCta) {
          finalCtaVisible = entry.isIntersecting;
        }
      });
      syncStickyCta();
    },
    { threshold: 0 },
  );

  ctaObserver.observe(mobileHeroCta);
  if (mobileFinalCta) {
    ctaObserver.observe(mobileFinalCta);
  }
}

if (mobileDemoModal && mobileStickyCta) {
  const modalObserver = new MutationObserver(syncStickyCta);

  modalObserver.observe(mobileDemoModal, {
    attributes: true,
    attributeFilter: ["class"],
  });
}
