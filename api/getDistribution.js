import { handler as getDistribution } from "../netlify/functions/getDistribution.js";
import { adaptNetlifyHandler } from "../shared/vercelFunctionAdapter.js";

export default adaptNetlifyHandler(getDistribution);
