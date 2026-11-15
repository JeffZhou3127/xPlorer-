// Number formatting shared by the stats panels.
export const format = (value, digits = 0) =>
  value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Costs are in millions of dollars.
export const money = (value) => `$${format(value, 1)}M`;

// Why Continue is unavailable, or null when the design is within budget.
export const overBudgetReason = (cost, budget) =>
  cost > budget ? `The design is ${money(cost - budget)} over budget.` : null;

// Mission clock time: T−MM:SS before ignition, T+MM:SS after. The countdown rounds up
// so it shows T−00:10 at the start and reaches T+00:00 exactly at ignition.
export const formatMissionTime = (time) => {
  const seconds = time < 0 ? Math.ceil(-time) : Math.floor(time);
  const sign = time < 0 && seconds > 0 ? "−" : "+";
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `T${sign}${mm}:${ss}`;
};
