const emptyDistribution = () => ({
  fRice: 0,
  cgRice: 0,
  sugar: 0,
  salt: 0,
  gram: 0,
});

function toQuantity(value) {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity : 0;
}

function getCommodityKey(name) {
  const normalizedName = String(name || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  if (normalizedName === "rice" || normalizedName === "frice") return "fRice";
  if (normalizedName === "cgrice") return "cgRice";
  if (normalizedName === "sugar") return "sugar";
  if (normalizedName === "salt") return "salt";
  if (normalizedName === "gram" || normalizedName === "koil") return "gram";
  return null;
}

export async function getDistribution(shop_id) {
  const res = await fetch("/.netlify/functions/getDistribution", {
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
    throw new Error("Distribution response does not contain a data array");
  }

  const totalsByRc = new Map();

  for (const card of response.data) {
    const rc_id = card.existing_rc_number;
    if (rc_id == null) continue;

    const totals = totalsByRc.get(String(rc_id)) || {
      rc_id,
      ...emptyDistribution(),
    };

    for (const commodity of card.commodities || []) {
      const key = getCommodityKey(commodity.name);
      if (key) totals[key] += toQuantity(commodity.qty);
    }

    totalsByRc.set(String(rc_id), totals);
  }

  return Array.from(totalsByRc.values());
}
