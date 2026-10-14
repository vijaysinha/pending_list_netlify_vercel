import { getEposPeriod } from "../shared/eposPeriod.js";

function toQuantity(value) {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity : 0;
}

function sumQuantities(card, ...keys) {
  return keys.reduce((total, key) => total + toQuantity(card[key]), 0);
}

export async function getAllotment(shop_id) {
  const res = await fetch("/.netlify/functions/getAllotment", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ shop_id }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Function request failed: ${res.status} ${text}`);
  }

  const response = await res.json();
  if (!Array.isArray(response?.data)) {
    throw new Error("Allotment response does not contain a data array");
  }

  const { previousMonth, currentMonth } = getEposPeriod();
  return response.data.map((card) => ({
    rc_id: card.rc_id,
    familyHead: card.family_head ?? card["Family Head"] ?? "NA",
    scheme: card.scheme_name_en ?? card.scheme ?? card.Scheme ?? "",
    units: card.units ?? card.Units ?? 0,
    fRice: sumQuantities(
      card,
      `F Rice-${previousMonth}`,
      `F Rice-${currentMonth}`,
    ),
    cgRice: sumQuantities(
      card,
      `CGRice-${previousMonth}`,
      `CGRice-${currentMonth}`,
    ),
    sugar: sumQuantities(
      card,
      `Sugar-${previousMonth}`,
      `Sugar-${currentMonth}`,
    ),
    salt: sumQuantities(
      card,
      `Salt-${previousMonth}`,
      `Salt-${currentMonth}`,
    ),
    gram:
      toQuantity(
        card[`Koil-${previousMonth}`] ?? card[`Gram-${previousMonth}`],
      ) +
      toQuantity(card[`Koil-${currentMonth}`] ?? card[`Gram-${currentMonth}`]),
  }));
}
