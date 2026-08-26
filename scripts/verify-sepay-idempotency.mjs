import "dotenv/config";
import { Client } from "pg";

// One-off verification (not part of `npm test`, needs a running dev server +
// live DB): posts a correctly-X-Secret-Key-headed synthetic ORDER_PAID IPN
// payload at the real /api/webhooks/sepay route TWICE and confirms the
// amount increments exactly once on the second (replayed) delivery — same
// property scripts/verify-zalopay-idempotency.mjs proves for ZaloPay.
// Deliberately does NOT call SePay for real: we hold SEPAY_SECRET_KEY
// ourselves, so a synthetic payload headed the same way SePay would head it
// is enough to exercise our own DB logic, at zero cost.
const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const secretKey = process.env.SEPAY_SECRET_KEY;
if (!secretKey) {
  console.error("SEPAY_SECRET_KEY is not set — add it to .env first.");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

try {
  await client.query("delete from bids where gateway_order_id = '__test-sepay-idempotency__'");
  await client.query("delete from listings where identity_key = '__test-sepay-idempotency__'");
  await client.query("delete from categories where slug = '__test__'");

  const { rows: catRows } = await client.query(
    `insert into categories (slug, name_vi, sort_order) values ('__test__', 'test', 999)
     on conflict (slug) do update set slug = excluded.slug returning id`,
  );
  const categoryId = catRows[0].id;

  const { rows: listingRows } = await client.query(
    `insert into listings (identity_key, display_url, category_id, submitter_email)
     values ('__test-sepay-idempotency__', 'test.example.com', $1, 'test@example.com')
     returning id`,
    [categoryId],
  );
  const listingId = listingRows[0].id;

  const DELTA = 100000;
  const { rows: bidRows } = await client.query(
    `insert into bids (listing_id, delta_amount, vat_amount, total_charged, gateway_order_id, status)
     values ($1, $2, 0, $2, '__test-sepay-idempotency__', 'pending') returning id`,
    [listingId, DELTA],
  );
  const bidId = bidRows[0].id;

  const payload = {
    timestamp: Date.now(),
    notification_type: "ORDER_PAID",
    order: {
      order_invoice_number: "__test-sepay-idempotency__",
      order_amount: DELTA,
    },
    transaction: {
      id: 999999999,
      transaction_id: "TEST-TXN-1",
    },
  };

  async function postWebhook() {
    const res = await fetch(`${BASE_URL}/api/webhooks/sepay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Secret-Key": secretKey },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  const first = await postWebhook();
  const second = await postWebhook();
  console.log("First delivery ack:", first);
  console.log("Second (replayed) delivery ack:", second);

  const { rows: finalRows } = await client.query("select amount from listings where id = $1", [listingId]);
  console.log(`Final amount: ${finalRows[0].amount} (expected ${DELTA}).`);
  console.log(finalRows[0].amount === DELTA ? "PASS — replay was a no-op." : "FAIL — amount incremented more than once.");

  await client.query("delete from bids where id = $1", [bidId]);
  await client.query("delete from listings where id = $1", [listingId]);
  await client.query("delete from categories where id = $1", [categoryId]);
} finally {
  await client.end();
}
