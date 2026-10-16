import { env } from "node:process";
import { getEposPeriod } from "../../shared/eposPeriod.js";

const retryDelays = [300, 900];

async function fetchPortPeriod(url, options, period) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (attempt === retryDelays.length) {
        const causeCode = error.cause?.code ?? error.code;
        const connectionError = new Error(
          `EPOS connection failed for ${period}: ${error.message}${
            causeCode ? ` (${causeCode})` : ""
          }`,
          { cause: error },
        );
        connectionError.code = causeCode;
        throw connectionError;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
    }
  }
}

function getEntitlementKey(entitlement) {
  const commodity =
    entitlement?.comm_name_eng ??
    entitlement?.comm_name_en ??
    entitlement?.comm_short;
  const month =
    entitlement?.month_short_name ??
    entitlement?.month ??
    entitlement?.alot_month;

  if (commodity == null || month == null) {
    return JSON.stringify(entitlement);
  }

  return [
    String(commodity).toLowerCase(),
    String(month).toLowerCase(),
    entitlement?.year ?? entitlement?.alot_year ?? "",
    entitlement?.unit_type ?? "",
    entitlement?.scheme_id ?? entitlement?.scheme_short_name ?? "",
  ].join("|");
}

export async function handler(event) {
  try {
    const { rc_id } = JSON.parse(event.body || "{}");

    if (!rc_id) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "rc_id is required" }),
      };
    }

    const { EPOS_CAPTCHA: captcha, EPOS_SALT: salt } = env;
    if (!captcha || !salt) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "EPOS_CAPTCHA and EPOS_SALT environment variables are required",
        }),
      };
    }

    const { previousMonth, previousYear, currentMonth, currentYear } =
      getEposPeriod();
    const periods = [
      { month: previousMonth, year: previousYear },
      { month: currentMonth, year: currentYear },
    ];
    const portFpsId = [];
    const entitlementsByRecord = new Map();
    let members = [];

    for (const { month, year } of periods) {
      const period = `${month}/${year}`;
      let res;
      try {
        res = await fetchPortPeriod(
          "https://epos.cg.gov.in/Epos_Spring/sdms/SRC_Trans_Int",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              month: String(month),
              year: String(year),
              src_no: parseInt(rc_id),
              captcha,
              salt,
            }),
          },
          period,
        );
      } catch (err) {
        console.error(`PORT data request failed for ${period}:`, err);
        return {
          statusCode: 502,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            error: err.message,
            code: err.cause?.code ?? err.code ?? null,
          }),
        };
      }

      if (!res.ok) {
        const text = await res.text();
        return {
          statusCode: res.status,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            error: `Port data request failed for ${month}/${year}: ${res.status} ${text}`,
          }),
        };
      }

      const response = await res.json();
      const noDataFound = /no data found/i.test(
        String(response?.respmsg || ""),
      );
      if (
        response?.respcode != null &&
        String(response.respcode) !== "200" &&
        !noDataFound
      ) {
        return {
          statusCode: 502,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            error: `Port data request failed for ${month}/${year}: ${
              response.respmsg || `EPOS response code ${response.respcode}`
            }`,
          }),
        };
      }

      if (
        response?.respcode == null &&
        !noDataFound &&
        !Array.isArray(response?.benficaryTransList)
      ) {
        return {
          statusCode: 502,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            error: `Port data response for ${month}/${year} does not contain a transaction list`,
          }),
        };
      }

      if (Array.isArray(response.benficaryTransList)) {
        portFpsId.push(...response.benficaryTransList);
      }
      const entitlements =
        response.benficaryEntitlementList ??
        response.beneficaryEntitlementList;
      if (Array.isArray(entitlements)) {
        for (const entitlement of entitlements) {
          entitlementsByRecord.set(
            getEntitlementKey(entitlement),
            entitlement,
          );
        }
      }
      if (!members.length && Array.isArray(response.beneficaryMemberList)) {
        members = response.beneficaryMemberList;
      }
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        port_fpsid: portFpsId,
        entitlements: Array.from(entitlementsByRecord.values()),
        members: Array.isArray(members) ? members : [],
      }),
    };
    


  } catch (err) {
    console.error("PORT data request failed:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: err.message,
        code: err.cause?.code ?? err.code ?? null,
      }),
    };
  }
}
