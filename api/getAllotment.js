import { handler as getAllotment } from "../netlify/functions/getAllotment.js";
import { adaptNetlifyHandler } from "../shared/vercelFunctionAdapter.js";

export default adaptNetlifyHandler(getAllotment);
