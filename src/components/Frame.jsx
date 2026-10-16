import { useCallback, useEffect, useState } from "react";
import getFinalData from "../getFinalData";
import PortComponent from "./PortComponent";

const quantityColumns = [
  { key: "fRice", label: "F Rice" },
  { key: "cgRice", label: "CGRice" },
  { key: "sugar", label: "Sugar" },
  { key: "salt", label: "Salt" },
  { key: "gram", label: "Koil / चना" },
];

function Quantity({ value }) {
  return (
    <span className={value > 0 ? "quantity-pending" : ""}>
      {value ?? "—"}
    </span>
  );
}

function Frame() {
  const [shopId, setShopId] = useState("");
  const [searchRequest, setSearchRequest] = useState(null);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [portDataByRc, setPortDataByRc] = useState({});
  const [portErrorsByRc, setPortErrorsByRc] = useState({});
  const [loading, setLoading] = useState(false);

  const handlePortData = useCallback((rc_id, portData) => {
    setPortDataByRc((current) => {
      const key = String(rc_id);
      const existing = current[key];
      if (
        existing?.family_member_name === portData.family_member_name &&
        existing?.riceQuantities?.fRice === portData.riceQuantities.fRice &&
        existing?.riceQuantities?.cgRice === portData.riceQuantities.cgRice &&
        existing?.fps_id === portData.fps_id &&
        existing?.member_name_en === portData.member_name_en
      ) {
        return current;
      }

      return { ...current, [key]: portData };
    });
    setPortErrorsByRc((current) => {
      const key = String(rc_id);
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const handlePortError = useCallback((rc_id, message) => {
    setPortErrorsByRc((current) => {
      const key = String(rc_id);
      if (current[key] === message) return current;
      return { ...current, [key]: message };
    });
  }, []);

  useEffect(() => {
    if (!searchRequest) return;
    let isCurrentRequest = true;

    const fetchData = async () => {
      try {
        const result = await getFinalData(searchRequest.shopId);
        if (isCurrentRequest) setData(result);
      } catch (err) {
        console.error(err);
        if (isCurrentRequest) {
          setError(err.message || "Failed to load data");
        }
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isCurrentRequest = false;
    };
  }, [searchRequest]);

  function getDisplayedQuantity(item, key) {
    const quantity = Number(item[key]) || 0;
    if (key !== "fRice" && key !== "cgRice") return quantity;
    if (quantity <= 0) return quantity;

    const portData = portDataByRc[String(item.rc_id)];
    if (!portData) return null;

    const portQuantity = Number(portData.riceQuantities?.[key]) || 0;
    return Math.max(0, quantity - portQuantity);
  }

  function hasRemainingRice(item) {
    return (
      Number(getDisplayedQuantity(item, "fRice")) > 0 ||
      Number(getDisplayedQuantity(item, "cgRice")) > 0
    );
  }

  function getFamilyMemberName(item) {
    return (
      portDataByRc[String(item.rc_id)]?.family_member_name ||
      item.familyHead ||
      "NA"
    );
  }

  function getPickupStatus(item) {
    if (hasRemainingRice(item)) {
      return { label: "उठाव शेष", pending: true };
    }

    const portData = portDataByRc[String(item.rc_id)];
    if (portData.fps_id) {
      return {
        label: `चावल का ${portData.fps_id} से ${
          portData.member_name_en || "हितग्राही"
        } द्वारा उठाव`,
        pending: false,
      };
    }
    return { label: "उठाव दर्ज है — शेष नहीं", pending: false };
  }

  const portCheckCandidates = data ?? [];
  const portChecksComplete = portCheckCandidates.every((item) => {
    const key = String(item.rc_id);
    return Boolean(portDataByRc[key] || portErrorsByRc[key]);
  });
  const isCheckingPortData =
    Boolean(data) && portCheckCandidates.length > 0 && !portChecksComplete;
  const verifiedPortCandidates = portCheckCandidates.filter(
    (item) => portDataByRc[String(item.rc_id)],
  );
  const pendingRiceData = verifiedPortCandidates.filter(hasRemainingRice);
  const pickedUpData = verifiedPortCandidates.filter(
    (item) => !hasRemainingRice(item),
  );
  const reportData = [...pendingRiceData, ...pickedUpData];
  const portCheckErrors = portCheckCandidates.filter(
    (item) => portErrorsByRc[String(item.rc_id)],
  );

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedShopId = shopId.trim();
    if (trimmedShopId) {
      setData(null);
      setPortDataByRc({});
      setPortErrorsByRc({});
      setError(null);
      setLoading(true);
      setSearchRequest({ shopId: trimmedShopId });
    }
  }

  return (
    <main className="app-shell">
      <section className="search-panel">
        <h1>
          छूटे हुए हितग्राही जिनका उठाव शेष है अथवा मूल दुकान से उठाव नहीं हुआ है
        </h1>
        <form className="shop-search" onSubmit={handleSubmit}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]+"
            required
            placeholder="दुकान क्रमांक दर्ज करें..."
            aria-label="दुकान क्रमांक"
            value={shopId}
            onChange={(event) => setShopId(event.target.value)}
          />
          <button type="submit">खोजें</button>
        </form>
      </section>

      <section className="results-panel">
        {loading && <p className="message">डेटा लोड हो रहा है...</p>}
        {error && <p className="message error-message">{error}</p>}
        {data && (
          <>
            <div className="register-heading">
              <h2>उठाव शेष</h2>
              <p>
                शेष मात्रा = आवंटन − उठाव − पोर्ट से उठाव
                {searchRequest?.shopId
                  ? ` · दुकान क्रमांक ${searchRequest.shopId}`
                  : ""}
                {" · "}
                उठाव शेष: {pendingRiceData.length} · राशन उठा चुके:{" "}
                {pickedUpData.length}
              </p>
            </div>

            {isCheckingPortData && (
              <p className="message">पोर्ट डेटा जाँचा जा रहा है...</p>
            )}
            {portCheckErrors.length > 0 && (
              <div className="message error-message">
                {portCheckErrors.map((item) => (
                  <p key={item.rc_id}>
                    RC {item.rc_id}: PORT जाँच विफल —{" "}
                    {portErrorsByRc[String(item.rc_id)]}
                  </p>
                ))}
              </div>
            )}

            {!isCheckingPortData && reportData.length === 0 ? (
              <p className="message">इस दुकान के लिए कोई रिकॉर्ड नहीं मिला।</p>
            ) : reportData.length > 0 && (
              <div className="table-scroll">
                <table className="allotment-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>क्र.</th>
                      <th rowSpan={2}>RC Id</th>
                      <th rowSpan={2}>Family Member</th>
                      <th rowSpan={2}>Scheme</th>
                      <th rowSpan={2}>Units</th>
                      <th colSpan={quantityColumns.length}>
                        शेष मात्रा (आवंटन − उठाव − पोर्ट से उठाव)
                      </th>
                      <th rowSpan={2}>उठाव की स्थिति</th>
                    </tr>
                    <tr>
                      {quantityColumns.map(({ key, label }) => (
                        <th key={key}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item, index) => (
                      <tr key={item.rc_id}>
                        <td>{index + 1}</td>
                        <td className="rc-number">{item.rc_id}</td>
                        <td>{getFamilyMemberName(item)}</td>
                        <td>{item.scheme || "—"}</td>
                        <td>{item.units ?? 0}</td>
                        {quantityColumns.map(({ key }) => (
                          <td key={key}>
                            <Quantity value={getDisplayedQuantity(item, key)} />
                          </td>
                        ))}
                        <td className="status-cell">
                          <p
                            className={`port-status ${
                              getPickupStatus(item).pending
                                ? "port-status--pending"
                                : "port-status--found"
                            }`}
                          >
                            {getPickupStatus(item).label}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportData.length > 0 && (
                  <div className="mobile-records">
                    {reportData.map((item, index) => (
                      <article className="mobile-record" key={item.rc_id}>
                        <h3>
                          {index + 1}. RC Id: <span>{item.rc_id}</span>
                        </h3>
                        <p>Family Member: {getFamilyMemberName(item)}</p>
                        <p>
                          Scheme: {item.scheme || "—"} · Units: {item.units ?? 0}
                        </p>
                        <div className="mobile-quantities">
                          {quantityColumns.map(({ key, label }) => (
                            <p key={key}>
                              {label}:{" "}
                              <Quantity value={getDisplayedQuantity(item, key)} />
                            </p>
                          ))}
                        </div>
                        <p
                          className={`port-status ${
                            getPickupStatus(item).pending
                              ? "port-status--pending"
                              : "port-status--found"
                          }`}
                        >
                          {getPickupStatus(item).label}
                        </p>
                      </article>
                    ))}
                  </div>
            )}
          </>
        )}
        <div hidden>
          {portCheckCandidates.map((item) => (
            <PortComponent
              key={item.rc_id}
              rc_id={item.rc_id}
              onPortData={handlePortData}
              onPortError={handlePortError}
            />
          ))}
        </div>
        <footer className="app-footer">@Raigarh</footer>
      </section>
    </main>
  );
}

export default Frame;
