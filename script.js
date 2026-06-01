const nav = document.querySelector("[data-nav]");
const utterances = Array.from(document.querySelectorAll(".utterance"));
const form = document.querySelector(".access-form");
const formStatus = document.querySelector(".form-status");

const SUPABASE_URL = "https://vriofvpoagfnlmrbepkm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ztm-q3VrZeqqABxCp1b-sQ_jBA-Me9Y";
const EARLY_ACCESS_TABLE = "early_access_requests";
const REQUEST_SOURCE = "sadha_landing";

const setNavState = () => {
  nav.classList.toggle("is-scrolled", window.scrollY > 12);
};

let activeIndex = 0;
let transcriptCycle = null;
const cycleTranscript = () => {
  utterances[activeIndex].classList.remove("active");
  activeIndex = (activeIndex + 1) % utterances.length;
  utterances[activeIndex].classList.add("active");
};

const setActiveUtterance = (index) => {
  utterances[activeIndex].classList.remove("active");
  activeIndex = index;
  utterances[activeIndex].classList.add("active");
};

const startTranscriptCycle = () => {
  transcriptCycle = window.setInterval(cycleTranscript, 2400);
};

const stopTranscriptCycle = () => {
  window.clearInterval(transcriptCycle);
};

window.addEventListener("scroll", setNavState, { passive: true });
setNavState();
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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = form.querySelector("input");
  const button = form.querySelector("button");
  const email = input.value.trim().toLowerCase();

  if (!email) {
    input.focus();
    return;
  }

  if (!SUPABASE_URL) {
    setFormStatus("Supabase project URL is missing.", "error");
    return;
  }

  submitEarlyAccess({ email, button, input });
});

const setFormStatus = (message, tone = "") => {
  formStatus.textContent = message;
  formStatus.classList.toggle("is-success", tone === "success");
  formStatus.classList.toggle("is-error", tone === "error");
};

const setSubmitting = (button, isSubmitting) => {
  button.disabled = isSubmitting;
  button.textContent = isSubmitting ? "Submitting..." : "Request Early Access";
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
      setFormStatus("Request already received. We'll be in touch soon.", "success");
      return;
    }

    if (!response.ok) {
      throw new Error(`Supabase insert failed with ${response.status}`);
    }

    input.value = "";
    setFormStatus("Request received. We'll be in touch soon.", "success");
  } catch (error) {
    console.error(error);
    setFormStatus("Something went wrong. Please try again.", "error");
  } finally {
    setSubmitting(button, false);
  }
};
