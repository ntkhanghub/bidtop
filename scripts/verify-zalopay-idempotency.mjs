import { createHmac } from "node:crypto";
import "dotenv/config";
import { Client } from "pg";

// One-off verification (not part of `npm test`, needs a running dev server +
// live DB): posts a correctly-signed synthetic IPN payload at the real
// /api/webhooks/zalopay route TWICE and confirms the amount increments
// exactly once on the second (replayed) delivery — F6's acceptance line,
// "receiving the same gateway_order_id webhook twice applies the amount
// increment exactly once." Deliberately does NOT call ZaloPay for real: we
// hold ZALOPAY_KEY2 ourselves, so a synthetic payload signed the same way
// ZaloPay would sign it is enough to exercise our own DB logic, at zero cost.
const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const key2 = process.env.ZALOPAY_KEY2;
if (!key2) {
  console.error("ZALOPAY_KEY2 is not set — add it to .env first.");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

try {
  await client.query("delete from bids where gateway_order_id = '__test-ipn-idempotency__'");
  await client.query("delete from listings where identity_key = '__test-ipn-idempotency__'");
  await client.query("delete from categories where slug = '__test__'");

  const { rows: catRows } = await client.query(
    `insert into categories (slug, name_vi, sort_order) values ('__test__', 'test', 999)
     on conflict (slug) do update set slug = excluded.slug returning id`,
  );
  const categoryId = catRows[0].id;

  const { rows: listingRows } = await client.query(
    `insert into listings (identity_key, display_url, category_id, submitter_email)
     values ('__test-ipn-idempotency__', 'test.example.com', $1, 'test@example.com')
     returning id`,
    [categoryId],
  );
  const listingId = listingRows[0].id;

  const DELTA = 100000;
  const { rows: bidRows } = await client.query(
    `insert into bids (listing_id, delta_amount, vat_amount, total_charged, gateway_order_id, status)
     values ($1, $2, 0, $2, '__test-ipn-idempotency__', 'pending') returning id`,
    [listingId, DELTA],
  );
  const bidId = bidRows[0].id;

  const dataStr = JSON.stringify({
    apptransid: "__test-ipn-idempotency__",
    amount: DELTA,
    zptransid: 999999999,
  });
  const mac = createHmac("sha256", key2).update(dataStr).digest("hex");

  async function postWebhook() {
    const res = await fetch(`${BASE_URL}/api/webhooks/zalopay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: dataStr, mac }),
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
