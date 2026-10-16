import { useEffect } from "react";
import usePortData from "../usePortData";

function PortComponent({ rc_id, onPortData, onPortError }) {
  const { error, fps_id, riceQuantities } = usePortData(rc_id);

  useEffect(() => {
    if (riceQuantities) {
      onPortData(rc_id, {
        riceQuantities,
        family_member_name: fps_id.family_member_name,
        fps_id: fps_id.fps_id,
        member_name_en: fps_id.member_name_en,
      });
    }
  }, [
    fps_id.family_member_name,
    fps_id.fps_id,
    fps_id.member_name_en,
    onPortData,
    rc_id,
    riceQuantities,
  ]);

  useEffect(() => {
    if (error) onPortError(rc_id, error);
  }, [error, onPortError, rc_id]);

  return null;
}

export default PortComponent;