import Anthropic from "@anthropic-ai/sdk";

// Source of truth for slugs: docs/sprints/sprint-01-foundation.md S1-T5 /
// supabase/seed.sql. Keep in sync by hand if categories ever change.
export const CATEGORY_SLUGS = [
  "seo-ai-visibility",
  "ai-agents-infra",
  "ai-content-generation",
  "marketing-advertising",
  "developer-tools",
  "productivity-personal",
  "design-creative",
  "social-creator-tools",
  "writing-content",
  "sales-lead-gen",
  "business-finance-legal",
  "education-learning",
  "health-fitness",
  "directories-launch",
  "hiring-jobs",
  "agencies-services",
  "media-news",
  "real-estate",
  "study-abroad",
  "food-restaurants",
  "other",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

const client = new Anthropic();

// One-shot suggestion only — never launch-blocking. The submitter sees and can
// override this before checkout (F5), and admin can correct it at approval
// (F8), so a failure or a bad guess here just falls back to "other".
export async function suggestCategory(
  identity: string,
  pageText?: string,
): Promise<CategorySlug> {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      tools: [
        {
          name: "classify_category",
          description: "Classify a business listing into exactly one category slug.",
          input_schema: {
            type: "object",
            properties: {
              slug: { type: "string", enum: CATEGORY_SLUGS as unknown as string[] },
            },
            required: ["slug"],
            additionalProperties: false,
          },
          strict: true,
        },
      ],
      tool_choice: { type: "tool", name: "classify_category" },
      messages: [
        {
          role: "user",
          content: `Classify this business listing into exactly one category slug.\n\nURL/handle: ${identity}${
            pageText ? `\n\nPage content:\n${pageText.slice(0, 2000)}` : ""
          }`,
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    const slug = toolUse && toolUse.type === "tool_use" ? (toolUse.input as { slug?: string }).slug : undefined;

    return (CATEGORY_SLUGS as readonly string[]).includes(slug ?? "")
      ? (slug as CategorySlug)
      : "other";
  } catch {
    return "other";
  }
}
