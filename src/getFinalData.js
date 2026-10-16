import { getAllotment } from "./getAllotment.js";
import { getDistribution } from "./getDistribution.js";

export default async function getFinalData(shop_id) {
  const [distributionData, allotmentData] = await Promise.all([
    getDistribution(shop_id),
    getAllotment(shop_id),
  ]);

  const temporaryData = findAllotment(distributionData, allotmentData);
  return temporaryData.filter(
    (item) => Number(item.fRice) > 0 || Number(item.cgRice) > 0,
  );
}

function findAllotment(distributionData, allotmentData) {
  const searchableRC = Object.fromEntries(
    distributionData.map((obj) => [String(obj.rc_id), obj]),
  );
  const commodityKeys = ["fRice", "cgRice", "sugar", "salt", "gram"];

  return allotmentData.map((a) => {
    const distributed = searchableRC[String(a.rc_id)];
    return {
      ...a,
      ...Object.fromEntries(
        commodityKeys.map((key) => [
          key,
          (Number(a[key]) || 0) - (Number(distributed?.[key]) || 0),
        ]),
      ),
    };
  });
}
