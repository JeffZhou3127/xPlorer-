// Number formatting shared by the stats panels.
export const format = (value, digits = 0) =>
  value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Costs are in millions of dollars.
export const money = (value) => `$${format(value, 1)}M`;

// Why Continue is unavailable, or null when the design is within budget.
export const overBudgetReason = (cost, budget) =>
  cost > budget ? `The design is ${money(cost - budget)} over budget.` : null;
