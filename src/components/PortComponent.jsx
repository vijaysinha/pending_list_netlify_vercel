import { useEffect } from "react";
import usePortData from "../usePortData";

function PortComponent({ rc_id, onRiceQuantities }) {
  const { error, fps_id, loading, riceQuantities } = usePortData(rc_id);

  useEffect(() => {
    if (riceQuantities) onRiceQuantities(rc_id, riceQuantities);
  }, [onRiceQuantities, rc_id, riceQuantities]);

  if (loading) {
    return <p className="port-status port-status--loading">Loading...</p>;
  }

  if (error) {
    return <p className="port-status port-status--error">Error fetching data</p>;
  }

  const hasPortData = Boolean(fps_id.fps_id);
  return (
    <p
      className={`port-status ${
        hasPortData ? "port-status--found" : "port-status--pending"
      }`}
    >
      {hasPortData
        ? `चावल का ${fps_id.fps_id} से ${fps_id.member_name_en} द्वारा उठाव`
        : "शायद उठाव शेष"}
    </p>
  );
}

export default PortComponent;