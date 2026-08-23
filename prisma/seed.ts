import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Seeding uses the direct connection (same as migrate) — it's a one-off CLI run,
// not a pooled runtime path.
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

// Source of truth: docs/sprints/sprint-01-foundation.md S1-T5.
const CATEGORIES: { slug: string; nameVi: string }[] = [
  { slug: "seo-ai-visibility", nameVi: "SEO & Hiển thị AI" },
  { slug: "ai-agents-infra", nameVi: "AI Agents & Hạ tầng AI" },
  { slug: "ai-content-generation", nameVi: "Tạo nội dung AI" },
  { slug: "marketing-advertising", nameVi: "Marketing & Quảng cáo" },
  { slug: "developer-tools", nameVi: "Công cụ Developer" },
  { slug: "productivity-personal", nameVi: "Năng suất & Cá nhân" },
  { slug: "design-creative", nameVi: "Thiết kế & Sáng tạo" },
  { slug: "social-creator-tools", nameVi: "Mạng xã hội & Creator" },
  { slug: "writing-content", nameVi: "Viết & Nội dung" },
  { slug: "sales-lead-gen", nameVi: "Bán hàng & Lead Gen" },
  { slug: "business-finance-legal", nameVi: "Kinh doanh, Tài chính & Pháp lý" },
  { slug: "education-learning", nameVi: "Giáo dục & Học tập" },
  { slug: "health-fitness", nameVi: "Sức khoẻ & Thể hình" },
  { slug: "directories-launch", nameVi: "Directory, Launch & Khám phá" },
  { slug: "hiring-jobs", nameVi: "Tuyển dụng & Việc làm" },
  { slug: "agencies-services", nameVi: "Agency & Dịch vụ chuyên môn" },
  { slug: "media-news", nameVi: "Truyền thông & Tin tức" },
  { slug: "real-estate", nameVi: "Bất động sản" },
  { slug: "study-abroad", nameVi: "Du học & Tư vấn du học" },
  { slug: "food-restaurants", nameVi: "Ẩm thực & Quán/Nhà hàng" },
  { slug: "other", nameVi: "Khác" },
];

const DEFAULT_SETTINGS: { key: string; value: string }[] = [
  { key: "starting_price", value: "100000" },
  { key: "min_increment", value: "50000" },
  { key: "vat_percent", value: "8" },
];

async function main() {
  for (const [index, category] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { nameVi: category.nameVi, sortOrder: index },
      create: { ...category, sortOrder: index },
    });
  }

  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log(
    `Seeded ${CATEGORIES.length} categories and ${DEFAULT_SETTINGS.length} settings.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
