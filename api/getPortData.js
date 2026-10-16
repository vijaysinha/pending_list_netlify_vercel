import { handler as getPortData } from "../netlify/functions/getPortData.js";
import { adaptNetlifyHandler } from "../shared/vercelFunctionAdapter.js";

export default adaptNetlifyHandler(getPortData);
