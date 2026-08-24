import { NextResponse } from "next/server";
import { z } from "zod";
import { suggestCategory } from "@/lib/categorize";

const bodySchema = z.object({ identity: z.string().min(1) });

// Separate from /lookup on purpose: this call can be slow (LLM), so the form
// shows pricing immediately and fills in the category suggestion when it
// resolves, rather than blocking on it. See Sprint 2 Risks.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu URL/@handle." }, { status: 400 });
  }

  const slug = await suggestCategory(parsed.data.identity);
  return NextResponse.json({ slug });
}
