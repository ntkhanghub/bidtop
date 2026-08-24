import "dotenv/config";
import { Client } from "pg";

// One-off verification (not part of `npm test`, needs live DB): fire N concurrent
// calls to increment_listing_amount() for the same listing and confirm the final
// amount equals the sum of all deltas — proving no lost update under concurrency.
const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

const N = 8;
try {
  await client.query("delete from listings where identity_key = '__test-concurrency__'");
  await client.query("delete from categories where slug = '__test__'");

  const { rows } = await client.query(
    `insert into categories (slug, name_vi, sort_order) values ('__test__', 'test', 999)
     on conflict (slug) do update set slug = excluded.slug returning id`,
  );
  const categoryId = rows[0].id;

  const { rows: listingRows } = await client.query(
    `insert into listings (identity_key, display_url, category_id, submitter_email)
     values ('__test-concurrency__', 'test.example.com', $1, 'test@example.com')
     returning id`,
    [categoryId],
  );
  const listingId = listingRows[0].id;

  // N separate connections firing concurrently — closer to N separate serverless
  // webhook invocations than N queries on one connection.
  const clients = Array.from({ length: N }, () => new Client({ connectionString: process.env.DIRECT_URL }));
  await Promise.all(clients.map((c) => c.connect()));
  await Promise.all(
    clients.map((c) => c.query("select * from increment_listing_amount($1, $2)", [listingId, 1])),
  );
  await Promise.all(clients.map((c) => c.end()));

  const { rows: finalRows } = await client.query(
    "select amount, first_confirmed_at from listings where id = $1",
    [listingId],
  );
  const { amount, first_confirmed_at } = finalRows[0];

  console.log(`Fired ${N} concurrent +1 increments. Final amount: ${amount} (expected ${N}).`);
  console.log(`first_confirmed_at set: ${first_confirmed_at !== null}`);
  console.log(amount === N ? "PASS — no lost update." : "FAIL — lost update detected.");

  await client.query("delete from listings where id = $1", [listingId]);
  await client.query("delete from categories where id = $1", [categoryId]);
} finally {
  await client.end();
}
