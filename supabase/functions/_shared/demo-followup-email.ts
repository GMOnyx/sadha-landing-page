export type DemoFollowup = {
  id: string;
  email: string;
  full_name: string | null;
  unsubscribe_token: string;
  attempts: number;
};

export const DEMO_FOLLOWUP_BOOKING_URL =
  "https://sadha.ai/?book_demo=1&utm_source=demo_followup&utm_medium=email&utm_campaign=finish_booking";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
    character
  ]!);

export const buildDemoFollowupEmail = (
  followup: DemoFollowup,
  from: string,
  projectUrl: string,
  replyTo = "abdarrahman@sadha.ai",
) => {
  const firstName = followup.full_name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const unsubscribeUrl = new URL("/functions/v1/demo-followup-preferences", projectUrl);
  unsubscribeUrl.searchParams.set("token", followup.unsubscribe_token);
  const preferencesUrl = new URL("https://sadha.ai/email-preferences.html");
  preferencesUrl.searchParams.set("token", followup.unsubscribe_token);
  const text = [
    greeting,
    "",
    "Thanks for your interest in Sadha. I’d love to hear about your team and show you how we can bring more clarity to your pipeline.",
    "",
    `What time works best for you? Pick a time here: ${DEMO_FOLLOWUP_BOOKING_URL}`,
    "",
    "Or just reply to this email with a time that suits you, and I’ll take it from there.",
    "",
    "Looking forward to meeting you,",
    "Abdarrahman",
    "Founder, Sadha",
    "",
    `Prefer not to hear from us? ${preferencesUrl.href}`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f0e8;color:#111;font-family:Arial,sans-serif">
    <div style="padding:28px 16px">
      <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #ded8cc;border-radius:18px;padding:28px 24px">
        <p style="color:#77736c;font-size:12px;letter-spacing:.1em;margin:0 0 20px">A note from our founder</p>
        <p style="font-size:17px;line-height:1.65;margin:0 0 16px">${escapeHtml(greeting)}</p>
        <p style="font-size:17px;line-height:1.65;margin:0 0 16px">Thanks for your interest in Sadha. I’d love to hear about your team and show you how we can bring more clarity to your pipeline.</p>
        <p style="font-size:17px;line-height:1.65;margin:0 0 20px">What time works best for you?</p>
        <a href="${escapeHtml(DEMO_FOLLOWUP_BOOKING_URL)}" style="display:inline-block;background:#000;color:#fff;padding:15px 22px;border-radius:10px;text-decoration:none;font-weight:700">Find a demo time</a>
        <p style="font-size:17px;line-height:1.65;margin:20px 0">Or just reply to this email with a time that suits you, and I’ll take it from there.</p>
        <p style="font-size:17px;line-height:1.65;margin:0">Looking forward to meeting you,<br><strong>Abdarrahman</strong><br><span style="color:#77736c">Founder, Sadha</span></p>
        <p style="font-size:12px;line-height:1.5;color:#77736c;margin:28px 0 0">Prefer not to hear from us? <a href="${escapeHtml(preferencesUrl.href)}" style="color:#77736c">Unsubscribe</a></p>
      </div>
    </div></body></html>`;

  return {
    from,
    to: [followup.email],
    reply_to: replyTo,
    subject: "What time works best for you?",
    text,
    html,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl.href}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    tags: [{ name: "demo_followup_id", value: followup.id.replaceAll("-", "") }],
  };
};
