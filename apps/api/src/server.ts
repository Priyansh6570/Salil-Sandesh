import { env } from "./config/env";
import { connectDb } from "./config/db";
import { createApp } from "./app";

async function main(): Promise<void> {
  await connectDb();
  console.log(`connected to mongodb database ${env.DB_NAME}`);
  const app = createApp();
  const port = env.PORT ?? env.API_PORT;
  app.listen(port, "0.0.0.0", () => {
    console.log(`api listening on 0.0.0.0:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
