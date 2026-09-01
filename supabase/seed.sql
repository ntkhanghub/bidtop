-- 30 categories + default settings. Source of truth:
-- docs/sprints/sprint-01-foundation.md S1-T5 (original 21) + the 2026-08-28
-- addition (9 more, matched against outbid.lol's category list — see
-- PROGRESS.md Decisions for 'web3-investing', the one deliberate rename).
-- Idempotent (upsert on conflict).
insert into categories (slug, name_vi, sort_order) values
  ('seo-ai-visibility', 'SEO & Hiển thị AI', 0),
  ('ai-agents-infra', 'AI Agents & Hạ tầng AI', 1),
  ('ai-content-generation', 'Tạo nội dung AI', 2),
  ('marketing-advertising', 'Marketing & Quảng cáo', 3),
  ('developer-tools', 'Công cụ Developer', 4),
  ('productivity-personal', 'Năng suất & Cá nhân', 5),
  ('design-creative', 'Thiết kế & Sáng tạo', 6),
  ('social-creator-tools', 'Mạng xã hội & Creator', 7),
  ('writing-content', 'Viết & Nội dung', 8),
  ('sales-lead-gen', 'Bán hàng & Lead Gen', 9),
  ('business-finance-legal', 'Kinh doanh, Tài chính & Pháp lý', 10),
  ('education-learning', 'Giáo dục & Học tập', 11),
  ('health-fitness', 'Sức khoẻ & Thể hình', 12),
  ('directories-launch', 'Directory, Launch & Khám phá', 13),
  ('hiring-jobs', 'Tuyển dụng & Việc làm', 14),
  ('agencies-services', 'Agency & Dịch vụ chuyên môn', 15),
  ('media-news', 'Truyền thông & Tin tức', 16),
  ('real-estate', 'Bất động sản', 17),
  ('study-abroad', 'Du học & Tư vấn du học', 18),
  ('food-restaurants', 'Ẩm thực & Quán/Nhà hàng', 19),
  ('people-profiles', 'Cá nhân & Hồ sơ', 20),
  ('games-entertainment', 'Trò chơi & Giải trí', 21),
  ('ecommerce-retail', 'Thương mại điện tử & Bán lẻ', 22),
  ('audio-voice-podcasting', 'Âm thanh, Giọng nói & Podcast', 23),
  ('security-privacy-compliance', 'Bảo mật, Riêng tư & Tuân thủ', 24),
  ('domains-web-assets', 'Tên miền & Tài sản Web', 25),
  ('leaderboards-attention', 'Bảng xếp hạng & Thị trường sự chú ý', 26),
  ('travel-local-lifestyle', 'Du lịch, Địa phương & Phong cách sống', 27),
  ('web3-investing', 'Web3 & Đầu tư', 28),
  ('other', 'Khác', 29)
on conflict (slug) do update set name_vi = excluded.name_vi, sort_order = excluded.sort_order;

insert into settings (key, value) values
  ('starting_price', '100000'),
  ('min_increment', '50000'),
  ('vat_percent', '8'),
  ('show_click_count', 'false')
on conflict (key) do nothing;
