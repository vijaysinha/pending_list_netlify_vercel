import { useEffect, useState } from "react";

const portDataCache = new Map();
const PORT_DATA_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CONCURRENT_PORT_REQUESTS = 3;
let activePortRequests = 0;
const portRequestQueue = [];

function runNextPortRequest() {
  if (
    activePortRequests >= MAX_CONCURRENT_PORT_REQUESTS ||
    portRequestQueue.length === 0
  ) {
    return;
  }

  const { task, resolve, reject } = portRequestQueue.shift();
  activePortRequests += 1;
  Promise.resolve()
    .then(task)
    .then(resolve, reject)
    .finally(() => {
      activePortRequests -= 1;
      runNextPortRequest();
    });
}

function schedulePortRequest(task) {
  return new Promise((resolve, reject) => {
    portRequestQueue.push({ task, resolve, reject });
    runNextPortRequest();
  });
}

function getRiceKey(commodity) {
  const normalizedNames = [
    commodity?.comm_short,
    commodity?.comm_name_en,
    commodity?.comm_name_eng,
  ].map((name) => String(name || "").toLowerCase().replace(/[^a-z]/g, ""));

  if (normalizedNames.some((name) => ["frice", "rice"].includes(name))) {
    return "fRice";
  }
  if (normalizedNames.includes("cgrice")) return "cgRice";
  return null;
}

function getPositiveQuantity(commodity, fields) {
  for (const field of fields) {
    const quantity = Number(commodity?.[field]);
    if (Number.isFinite(quantity) && quantity > 0) return quantity;
  }

  return 0;
}

function getTransactionQuantity(commodity) {
  const directQuantity = getPositiveQuantity(commodity, [
    "sale_qty",
    "saleQty",
    "availed_qty",
    "availedQty",
    "recqty",
    "qty_1",
  ]);
  if (directQuantity > 0) return directQuantity;

  const schemeSaleQuantity =
    getPositiveQuantity(commodity, ["nfsasaleQty"]) +
    getPositiveQuantity(commodity, ["statesaleQty"]);
  if (schemeSaleQuantity > 0) return schemeSaleQuantity;

  return getPositiveQuantity(commodity, [
    "allot_qty",
    "allotQty",
    "allomtQty",
  ]);
}

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

  const request = schedulePortRequest(async () => {
    const res = await fetch("/.netlify/functions/getPortData", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rc_id }),
    });

    const response = await res.json();
    if (!res.ok) {
      throw new Error(
        response?.error || `Function request failed: ${res.status}`,
      );
    }

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
    const members = response?.members ?? response?.beneficaryMemberList ?? [];
    if (!Array.isArray(members)) {
      throw new Error("Port data response contains an invalid member list");
    }
    const familyMember = members.find((member) =>
      String(member?.member_id ?? "").endsWith("1"),
    );

    const riceQuantities = { fRice: 0, cgRice: 0 };
    for (const transaction of transactions) {
      if (!transaction?.port_fpsid) continue;
      for (const commodity of transaction?.commoditylist || []) {
        const key = getRiceKey(commodity);
        if (!key) continue;

        riceQuantities[key] += getTransactionQuantity(commodity);
      }
    }

    const portTransaction = transactions.find(
      (transaction) =>
        transaction?.port_fpsid &&
        (transaction?.commoditylist || []).some((commodity) =>
          getRiceKey(commodity),
        ),
    );

    return {
      fps_id: portTransaction?.port_fpsid || null,
      member_name_en: portTransaction?.availed_member_name || null,
      family_member_name: familyMember?.member_name_en || null,
      riceQuantities,
    };
  });

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
  const [error, setError] = useState(null);
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
          setError(null);
        }
      } catch (err) {
        if (isCurrentRequest) {
          setError({ rc_id: key, message: err.message });
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
  const errorForRc = error?.rc_id === key;
  const isLoading = Boolean(rc_id) && (loading || (!hasResultForRc && !errorForRc));

  return {
    error: errorForRc ? error.message : null,
    fps_id: hasResultForRc
      ? {
          fps_id: result.fps_id,
          member_name_en: result.member_name_en,
          family_member_name: result.family_member_name,
        }
      : {
          fps_id: null,
          member_name_en: null,
          family_member_name: null,
        },
        loading: isLoading,
        riceQuantities: hasResultForRc ? result.riceQuantities : null,
  };
}
