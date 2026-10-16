import { getEposPeriod } from "../../shared/eposPeriod.js";

const retryDelays = [250, 750];

async function fetchAllotmentFromEpos(url, options) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (attempt === retryDelays.length) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
    }
  }
}

export async function handler(event) {
  try {
    const { shop_id } = JSON.parse(event.body || "{}");

    if (!shop_id) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "shop_id is required" }),
      };
    }

    const { previousMonth, previousYear } = getEposPeriod();
    let res;
    try {
      res = await fetchAllotmentFromEpos(
        "https://epos.cg.gov.in/Epos_Spring/KeyRegister/getfpsKeyRegisterCardsList",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            month: String(previousMonth),
            year: String(previousYear),
            dist_code: "386",
            afso_code: "4048",
            fps_id: shop_id,
          }),
        },
      );
    } catch (err) {
      console.error("Allotment request failed:", err);
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: `Unable to reach the EPOS allotment service: ${err.message}`,
          code: err.cause?.code ?? err.code ?? null,
        }),
      };
    }

    if (!res.ok) {
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `Remote API error: ${res.status} ${text}` }),
      };
    }

    const data = await res.json();

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("Allotment handler error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
}
