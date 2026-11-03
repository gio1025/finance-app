import type { Entry, RecurringRule, SavedDescription, Tag } from "./budget";
import { isSupabaseConfigured, supabase } from "./supabase";

export type BudgetSnapshot = {
  entries: Entry[];
  recurringRules: RecurringRule[];
  tags: Tag[];
  savedDescriptions: SavedDescription[];
  currency: string;
};

function requireSupabase() {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Supabase isn't configured.");
  }
  return supabase;
}

async function replaceRows(
  userId: string,
  table: "budget_entries" | "budget_tags" | "budget_recurring" | "budget_descriptions",
  rows: Record<string, string | number | null>[]
) {
  const client = requireSupabase();
  const { data: existing, error: readError } = await client
    .from(table)
    .select("id")
    .eq("user_id", userId);
  if (readError) throw readError;

  const ids = new Set(rows.map((row) => row.id as string));
  const staleIds = (existing ?? [])
    .map((row) => row.id)
    .filter((id) => !ids.has(id));

  if (staleIds.length) {
    const { error } = await client.from(table).delete().eq("user_id", userId).in("id", staleIds);
    if (error) throw error;
  }
  if (rows.length) {
    const { error } = await client.from(table).upsert(rows, { onConflict: "user_id,id" });
    if (error) throw error;
  }
}

async function writeRows(userId: string, snapshot: BudgetSnapshot) {
  await replaceRows(
    userId,
    "budget_entries",
    snapshot.entries.map((entry) => ({
      id: entry.id,
      user_id: userId,
      type: entry.type,
      title: entry.title,
      amount: entry.amount,
      created_at: entry.createdAt,
      date: entry.date ?? new Date(entry.createdAt).toISOString().slice(0, 10),
      time: entry.time ?? null,
      tag_id: entry.tagId ?? null,
      recurring_id: entry.recurringId ?? null,
    }))
  );
  await replaceRows(
    userId,
    "budget_recurring",
    snapshot.recurringRules.map((rule) => ({
      id: rule.id,
      user_id: userId,
      source_entry_id: rule.sourceEntryId,
      type: rule.type,
      title: rule.title,
      amount: rule.amount,
      tag_id: rule.tagId ?? null,
      time: rule.time,
      frequency: rule.frequency,
      start_date: rule.startDate,
      next_date: rule.nextDate,
      end_date: rule.endDate ?? null,
    }))
  );
  await replaceRows(
    userId,
    "budget_tags",
    snapshot.tags.map((tag) => ({
      id: tag.id,
      user_id: userId,
      name: tag.name,
      color: tag.color,
      kind: tag.kind,
    }))
  );
  await replaceRows(
    userId,
    "budget_descriptions",
    snapshot.savedDescriptions.map((description) => ({
      id: description.id,
      user_id: userId,
      name: description.name,
      description_type: description.type,
    }))
  );
}

export async function syncBudgetData(userId: string, snapshot: BudgetSnapshot) {
  const client = requireSupabase();
  const { error: settingsError } = await client
    .from("user_settings")
    .upsert({ user_id: userId, currency: snapshot.currency }, { onConflict: "user_id" });
  if (settingsError) throw settingsError;

  await writeRows(userId, snapshot);
}

export async function loadBudgetData(
  userId: string,
  localSnapshot: BudgetSnapshot
): Promise<BudgetSnapshot> {
  const client = requireSupabase();
  const { data: settings, error: settingsError } = await client
    .from("user_settings")
    .select("currency")
    .eq("user_id", userId)
    .maybeSingle();
  if (settingsError) throw settingsError;

  if (!settings) {
    await writeRows(userId, localSnapshot);
    const { error: createError } = await client
      .from("user_settings")
      .upsert(
        { user_id: userId, currency: localSnapshot.currency },
        { onConflict: "user_id" }
      );
    if (createError) throw createError;
    return localSnapshot;
  }

  const [entryResult, tagResult, recurringResult, descriptionResult] = await Promise.all([
    client
      .from("budget_entries")
      .select("id,type,title,amount,created_at,date,time,tag_id,recurring_id")
      .eq("user_id", userId),
    client.from("budget_tags").select("id,name,color,kind").eq("user_id", userId),
    client
      .from("budget_recurring")
      .select(
        "id,source_entry_id,type,title,amount,tag_id,time,frequency,start_date,next_date,end_date"
      )
      .eq("user_id", userId),
    client
      .from("budget_descriptions")
      .select("id,name,description_type")
      .eq("user_id", userId),
  ]);
  if (entryResult.error) throw entryResult.error;
  if (tagResult.error) throw tagResult.error;
  if (recurringResult.error) throw recurringResult.error;
  if (descriptionResult.error) throw descriptionResult.error;

  return {
    currency: settings.currency,
    entries: (entryResult.data ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title ?? "",
      amount: Number(row.amount),
      createdAt: Number(row.created_at),
      date: row.date,
      time: row.time ?? undefined,
      tagId: row.tag_id ?? undefined,
      recurringId: row.recurring_id ?? undefined,
    })),
    recurringRules: (recurringResult.data ?? []).map((row) => ({
      id: row.id,
      sourceEntryId: row.source_entry_id,
      type: row.type,
      title: row.title ?? "",
      amount: Number(row.amount),
      tagId: row.tag_id ?? undefined,
      time: row.time,
      frequency: row.frequency,
      startDate: row.start_date,
      nextDate: row.next_date,
      endDate: row.end_date ?? undefined,
    })),
    tags: (tagResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      kind: row.kind,
    })),
    savedDescriptions: (descriptionResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.description_type ?? "both",
    })),
  };
}
