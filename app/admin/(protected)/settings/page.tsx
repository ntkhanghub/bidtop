import { forbidden } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const session = await requireAdminPage();
  if (session.role !== "super_admin") forbidden();

  const { data: rows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["starting_price", "min_increment", "vat_percent"]);
  const settings = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]));

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Cài đặt</h1>
      <SettingsForm
        startingPrice={Number(settings.starting_price ?? 0)}
        minIncrement={Number(settings.min_increment ?? 0)}
        vatPercent={Number(settings.vat_percent ?? 0)}
      />
    </div>
  );
}
