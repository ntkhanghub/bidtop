// Best-effort admin notifications via Resend's HTTP API (plain fetch, not the
// resend SDK — CLAUDE.md: no new dependency for something under ~20 lines).
// Callers MUST wrap these in try/catch — an email failure must never block a
// listing submission or payment confirmation.
async function sendNotification(subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !to || !from) return; // not configured yet — silent no-op, not an error

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend API returned ${res.status}`);
}

// A brand-new listing was created (pending_payment) — not a top-up.
export function notifyNewSubmission(listing: { displayUrl: string; submitterEmail: string }) {
  return sendNotification(
    "BidTop.vn — Listing mới chờ thanh toán",
    `<p>Listing mới vừa được tạo, đang chờ thanh toán.</p><p><strong>${listing.displayUrl}</strong></p><p>Người đăng: ${listing.submitterEmail}</p>`,
  );
}

// A listing just reached paid_pending_review — the "go check the queue" moment.
export function notifyReadyForReview(listing: { displayUrl: string; submitterEmail: string }) {
  return sendNotification(
    "BidTop.vn — Listing sẵn sàng để duyệt",
    `<p>Listing đã thanh toán xong, cần admin duyệt.</p><p><strong>${listing.displayUrl}</strong></p><p>Người đăng: ${listing.submitterEmail}</p>`,
  );
}
