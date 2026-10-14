import { useEffect, useState } from "react";

const portDataCache = new Map();
const PORT_DATA_CACHE_TTL_MS = 5 * 60 * 1000;

function getPortData(rc_id) {
  const key = String(rc_id);
  const cachedEntry = portDataCache.get(key);
  if (
    cachedEntry &&
    (cachedEntry.expiresAt === null || cachedEntry.expiresAt > Date.now())
  ) {
    return cachedEntry.request;
  }
  if (cachedEntry) portDataCache.delete(key);

  const request = (async () => {
    const res = await fetch("/.netlify/functions/getPortData", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rc_id }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Function request failed: ${res.status} ${text}`);
    }

    const response = await res.json();
    if (
      response?.respcode != null &&
      String(response.respcode) !== "200"
    ) {
      throw new Error(response.respmsg || "Port data request was unsuccessful");
    }

    const transactions =
      response?.port_fpsid ?? response?.benficaryTransList;
    if (!Array.isArray(transactions)) {
      throw new Error("Port data response does not contain a transaction list");
    }

    const riceQuantities = { fRice: 0, cgRice: 0 };
    for (const transaction of transactions) {
      for (const commodity of transaction?.commoditylist || []) {
        const normalizedName = String(commodity?.comm_short || "")
          .toLowerCase()
          .replace(/[^a-z]/g, "");
        const key =
          normalizedName === "frice" || normalizedName === "rice"
            ? "fRice"
            : normalizedName === "cgrice"
              ? "cgRice"
              : null;

        if (key) {
          const quantity = Number(commodity.allot_qty);
          if (Number.isFinite(quantity)) riceQuantities[key] += quantity;
        }
      }
    }

    const portTransaction = transactions.find((transaction) =>
      transaction?.port_fpsid,
    );

    return {
      fps_id: portTransaction?.port_fpsid || null,
      member_name_en: portTransaction?.availed_member_name || null,
      riceQuantities,
    };
  })();

  const cacheEntry = { request, expiresAt: null };
  portDataCache.set(key, cacheEntry);
  request.then(
    () => {
      if (portDataCache.get(key) === cacheEntry) {
        cacheEntry.expiresAt = Date.now() + PORT_DATA_CACHE_TTL_MS;
      }
    },
    () => {
      if (portDataCache.get(key) === cacheEntry) {
        portDataCache.delete(key);
      }
    },
  );

  return request;
}

export default function usePortData(rc_id) {
  const [result, setResult] = useState(null);
  const [errorForRc, setErrorForRc] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rc_id) return;

    let isCurrentRequest = true;
    const key = String(rc_id);

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getPortData(rc_id);
        if (isCurrentRequest) {
          setResult({ rc_id: key, ...result });
          setErrorForRc(null);
        }
      } catch (err) {
        if (isCurrentRequest) {
          setErrorForRc(key);
          console.error(`Error fetching data for RC ID ${rc_id}:`, err);
        }
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isCurrentRequest = false;
    };
  }, [rc_id]);

  const key = String(rc_id);
  const hasResultForRc = result?.rc_id === key;
  const error = errorForRc === key;
  const isLoading = Boolean(rc_id) && (loading || (!hasResultForRc && !error));

  return {
    error,
    fps_id: hasResultForRc
      ? { fps_id: result.fps_id, member_name_en: result.member_name_en }
      : { fps_id: null, member_name_en: null },
    loading: isLoading,
    riceQuantities: hasResultForRc ? result.riceQuantities : null,
  };
}
