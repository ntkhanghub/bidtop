import "dotenv/config";
import { Client } from "pg";

// One-off verification (not part of `npm test`, needs live DB): fires two
// DIFFERENT bids' confirm_bid_and_increment() calls at the SAME listing
// concurrently and confirms the final amount equals the sum of both deltas —
// the same "no lost update" property scripts/verify-atomic-increment.mjs
// already proved for increment_listing_amount(), re-proved here for the
// combined bid-confirm+increment RPC the real SePay webhook calls (see
// supabase/migrations/20260826_confirm_bid_and_increment.sql). Also confirms
// first_confirmed_at is set once by whichever confirmation lands first and
// left unchanged by the second.
const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

try {
  await client.query("delete from bids where gateway_order_id like '__test-confirm-concurrency%'");
  await client.query("delete from listings where identity_key = '__test-confirm-concurrency__'");
  await client.query("delete from categories where slug = '__test__'");

  const { rows: catRows } = await client.query(
    `insert into categories (slug, name_vi, sort_order) values ('__test__', 'test', 999)
     on conflict (slug) do update set slug = excluded.slug returning id`,
  );
  const categoryId = catRows[0].id;

  const { rows: listingRows } = await client.query(
    `insert into listings (identity_key, display_url, category_id, submitter_email)
     values ('__test-confirm-concurrency__', 'test.example.com', $1, 'test@example.com')
     returning id`,
    [categoryId],
  );
  const listingId = listingRows[0].id;

  const DELTA_A = 100000;
  const DELTA_B = 50000;
  const { rows: bidRows } = await client.query(
    `insert into bids (listing_id, delta_amount, vat_amount, total_charged, gateway_order_id, status)
     values
       ($1, $2, 0, $2, '__test-confirm-concurrency-a__', 'pending'),
       ($1, $3, 0, $3, '__test-confirm-concurrency-b__', 'pending')
     returning id`,
    [listingId, DELTA_A, DELTA_B],
  );
  const [bidA, bidB] = bidRows.map((r) => r.id);

  const clientA = new Client({ connectionString: process.env.DIRECT_URL });
  const clientB = new Client({ connectionString: process.env.DIRECT_URL });
  await Promise.all([clientA.connect(), clientB.connect()]);
  await Promise.all([
    clientA.query("select * from confirm_bid_and_increment($1, $2)", [bidA, "test-txn-a"]),
    clientB.query("select * from confirm_bid_and_increment($1, $2)", [bidB, "test-txn-b"]),
  ]);
  await Promise.all([clientA.end(), clientB.end()]);

  const { rows: finalRows } = await client.query(
    "select amount, first_confirmed_at from listings where id = $1",
    [listingId],
  );
  const { amount, first_confirmed_at } = finalRows[0];
  const expected = DELTA_A + DELTA_B;

  console.log(`Fired 2 concurrent confirmations (${DELTA_A} + ${DELTA_B}). Final amount: ${amount} (expected ${expected}).`);
  console.log(`first_confirmed_at set: ${first_confirmed_at !== null}`);
  console.log(amount === expected ? "PASS — no lost update." : "FAIL — lost update detected.");

  // Replaying bid A's confirmation must be a no-op (already_confirmed=true, no re-increment).
  const { rows: replayRows } = await client.query(
    "select * from confirm_bid_and_increment($1, $2)",
    [bidA, "test-txn-a-replay"],
  );
  const { rows: afterReplayRows } = await client.query("select amount from listings where id = $1", [listingId]);
  console.log(
    replayRows[0].already_confirmed && afterReplayRows[0].amount === expected
      ? "PASS — replayed confirmation is a no-op."
      : "FAIL — replay changed the amount or reported already_confirmed=false.",
  );

  await client.query("delete from bids where id = any($1)", [[bidA, bidB]]);
  await client.query("delete from listings where id = $1", [listingId]);
  await client.query("delete from categories where id = $1", [categoryId]);
} finally {
  await client.end();
}
