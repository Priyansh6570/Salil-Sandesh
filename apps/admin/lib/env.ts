function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`missing required env var ${name}`);
  }
  return value;
}

export const adminEnv = {
  apiUrl: process.env.API_URL ?? "http://localhost:4000",
  get sessionSecret(): string {
    return required("ADMIN_SESSION_SECRET");
  },
};
