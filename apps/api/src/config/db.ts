import mongoose from "mongoose";
import { env } from "./env";

export async function connectDb(): Promise<typeof mongoose> {
  return mongoose.connect(env.MONGODB_URI, { dbName: env.DB_NAME });
}
