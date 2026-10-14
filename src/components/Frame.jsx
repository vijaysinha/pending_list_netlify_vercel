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
      {value ?? 0}
    </span>
  );
}

function Frame() {
  const [shopId, setShopId] = useState("");
  const [searchRequest, setSearchRequest] = useState(null);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [portDataByRc, setPortDataByRc] = useState({});
  const [loading, setLoading] = useState(false);

  const handlePortData = useCallback((rc_id, portData) => {
    setPortDataByRc((current) => ({
      ...current,
      [String(rc_id)]: portData,
    }));
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

    const portQuantity =
      Number(portDataByRc[String(item.rc_id)]?.riceQuantities?.[key]) || 0;
    return quantity - portQuantity;
  }

  function getFamilyMemberName(item) {
    if (Number(item.fRice) <= 0 && Number(item.cgRice) <= 0) return "—";

    return (
      portDataByRc[String(item.rc_id)]?.member_name_en ||
      item.familyHead ||
      "NA"
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedShopId = shopId.trim();
    if (trimmedShopId) {
      setData(null);
      setPortDataByRc({});
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
              <h2>RC-wise Pending Distribution</h2>
              <p>
                शेष मात्रा = आवंटन − उठाव − पोर्ट आवंटन
                {searchRequest?.shopId
                  ? ` · दुकान क्रमांक ${searchRequest.shopId}`
                  : ""}
              </p>
            </div>

            {data.length === 0 ? (
              <p className="message">इस दुकान के लिए कोई रिकॉर्ड नहीं मिला।</p>
            ) : (
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
                        शेष मात्रा (आवंटन − उठाव − पोर्ट आवंटन)
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
                    {data.map((item, index) => (
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
                          {(Number(item.fRice) > 0 ||
                            Number(item.cgRice) > 0) && (
                            <PortComponent
                              rc_id={item.rc_id}
                              onPortData={handlePortData}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mobile-records">
              {data.map((item, index) => (
                <article className="mobile-record" key={item.rc_id}>
                  <h3>
                    {index + 1}. RC Id: <span>{item.rc_id}</span>
                  </h3>
                  <p>Family Member: {getFamilyMemberName(item)}</p>
                  <p>Scheme: {item.scheme || "—"} · Units: {item.units ?? 0}</p>
                  <div className="mobile-quantities">
                    {quantityColumns.map(({ key, label }) => (
                      <p key={key}>
                        {label}:{" "}
                        <Quantity value={getDisplayedQuantity(item, key)} />
                      </p>
                    ))}
                  </div>
                  {(Number(item.fRice) > 0 || Number(item.cgRice) > 0) && (
                    <PortComponent
                      rc_id={item.rc_id}
                      onPortData={handlePortData}
                    />
                  )}
                </article>
              ))}
            </div>
          </>
        )}
        <footer className="app-footer">@Raigarh</footer>
      </section>
    </main>
  );
}

export default Frame;
