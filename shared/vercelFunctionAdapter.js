export function adaptNetlifyHandler(handler) {
  return async (request, response) => {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      response.statusCode = 405;
      response.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    try {
      const body =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body ?? {});
      const result = await handler({ body });

      response.statusCode = result.statusCode ?? 200;
      for (const [name, value] of Object.entries(result.headers ?? {})) {
        response.setHeader(name, value);
      }
      response.end(result.body ?? "");
    } catch (error) {
      console.error("Vercel function adapter error:", error);
      response.statusCode = 500;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ error: error.message }));
    }
  };
}
