// Central zod import: extendZodWithOpenApi patches the zod prototype with
// `.openapi(...)`, so every schema in the app (imported from here, not "zod"
// directly) can carry OpenAPI metadata used by src/openapi to generate docs
// straight from the same schemas that actually validate requests.
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export { z };
