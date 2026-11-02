import type { Entry, RecurringFrequency, RecurringRule } from "./budget";

const dateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return dateString(value);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function nextRecurringDate(rule: Pick<RecurringRule, "frequency" | "startDate">, date: string) {
  const current = new Date(`${date}T00:00:00`);
  const anchor = new Date(`${rule.startDate}T00:00:00`);
  if (rule.frequency === "daily") return shiftDate(date, 1);
  if (rule.frequency === "weekly") return shiftDate(date, 7);
  if (rule.frequency === "monthly") {
    const monthIndex = current.getFullYear() * 12 + current.getMonth() + 1;
    const year = Math.floor(monthIndex / 12);
    const month = monthIndex % 12;
    const day = Math.min(anchor.getDate(), daysInMonth(year, month));
    return dateString(new Date(year, month, day));
  }
  const year = current.getFullYear() + 1;
  const month = anchor.getMonth();
  const day = Math.min(anchor.getDate(), daysInMonth(year, month));
  return dateString(new Date(year, month, day));
}

export function firstRecurringDate(startDate: string, frequency: RecurringFrequency, today: string) {
  const rule = { startDate, frequency };
  let date = nextRecurringDate(rule, startDate);
  while (date <= today) date = nextRecurringDate(rule, date);
  return date;
}

export function materializeDueEntries(
  rules: RecurringRule[],
  entries: Entry[],
  today: string
) {
  const existingIds = new Set(entries.map((entry) => entry.id));
  const addedEntries: Entry[] = [];
  let rulesChanged = false;
  const updatedRules = rules.map((rule) => {
    let nextDate = rule.nextDate;
    while (nextDate <= today && (!rule.endDate || nextDate <= rule.endDate)) {
      const id = `recurring-${rule.id}-${nextDate}`;
      if (!existingIds.has(id)) {
        const createdAt = new Date(`${nextDate}T${rule.time || "00:00"}:00`).getTime();
        addedEntries.push({
          id,
          type: rule.type,
          title: rule.title,
          amount: rule.amount,
          createdAt,
          date: nextDate,
          time: rule.time,
          tagId: rule.tagId,
          recurringId: rule.id,
        });
        existingIds.add(id);
      }
      nextDate = nextRecurringDate(rule, nextDate);
    }
    if (nextDate !== rule.nextDate) rulesChanged = true;
    return nextDate === rule.nextDate ? rule : { ...rule, nextDate };
  });

  return {
    entries: addedEntries.length ? [...entries, ...addedEntries] : entries,
    rules: rulesChanged ? updatedRules : rules,
    entriesChanged: addedEntries.length > 0,
    rulesChanged,
  };
}
