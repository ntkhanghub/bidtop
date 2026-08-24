-- Speeds up F11's activity feed (bids WHERE status='confirmed' ORDER BY
-- confirmed_at DESC) and F13's future revenue SUM — no index existed for
-- either query shape before.
create index bids_confirmed_feed_idx on bids (status, confirmed_at desc);
