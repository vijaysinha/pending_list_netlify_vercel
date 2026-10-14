import { env } from "node:process";
import { getEposPeriod } from "../../shared/eposPeriod.js";

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

    const { previousMonth, previousYear } = getEposPeriod();
    const res = await fetch(
      "https://epos.cg.gov.in/Epos_Spring/sdms/SRC_Trans_Int",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          month: String(previousMonth),
          year: String(previousYear),
          src_no: parseInt(rc_id),
          captcha,
          salt,
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `Remote API error: ${res.status} ${text}` }),
      };
    }

    const response = await res.json();
    if (
      response?.respcode != null &&
      String(response.respcode) !== "200"
    ) {
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: response.respmsg || "Port data request was unsuccessful",
        }),
      };
    }

    if (!Array.isArray(response?.benficaryTransList)) {
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Port data response does not contain a transaction list",
        }),
      };
    }

    const portFpsId = response.benficaryTransList;
    // console.log("API response:", portFpsId);
   
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ port_fpsid: portFpsId }),
    };
    


  } catch (err) {
    console.error("Handler error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
}
