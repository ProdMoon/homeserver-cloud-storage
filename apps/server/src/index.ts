import { createApp } from "./app.js";
import { loadProjectEnv } from "./config.js";

loadProjectEnv();

const app = await createApp();

try {
  await app.listen({
    host: "0.0.0.0",
    port: Number.parseInt(process.env.PORT ?? "3000", 10)
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
