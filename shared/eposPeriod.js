const BUSINESS_TIME_ZONE = "Asia/Kolkata";

function getBusinessDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
}

export function getEposPeriod(date = new Date()) {
  const { month: currentMonth, year: currentYear } = getBusinessDateParts(date);
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  return {
    previousMonth,
    previousYear,
    currentMonth,
    currentYear,
  };
}

export function formatLocalDate(date = new Date()) {
  const { year, month, day } = getBusinessDateParts(date);

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}
