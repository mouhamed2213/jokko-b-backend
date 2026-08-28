import dotenv from "dotenv";

const runtimeMode = process.env.NODE_ENV || "development";
const envFile = runtimeMode === "production"
  ? ".env.production"
  : `.env.${runtimeMode}.local`;
dotenv.config({ path: envFile });

const data = process.env;

const envMode = data.NODE_ENV || "development";
const configuredOrigins = (data.CORS_ORIGINS || data.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  server: data.SERVER,
  port: Number(data.PORT) || 5000,
  logLevel: data.LOG_LEVEL,
  db: {
    url: data.DATABASE_URL,
    directUrl : data.DIRECT_URL
  },
  secret: {
    jwt: data.JWT_SECRET as string,
  },
  storage : {
    superbaseUrl : data.SUPABASE_URL as string,
    superbaseSecretKey : data.SUPABASE_SECRET_KEY as string, 
    publicBucketsUrl : `${process.env.SUPABASE_URL}/storage/v1/object/public`
  },

  //  Mail
  mail: {
    host: data.MAIL_HOST,
    port: 2525,
    user: data.MAIL_USER,
    password: data.MAIL_PASSWORD,
    from: data.MAIL_FROM,
  },
  log: {
    logLevel: data.LOG_LEVEL,
  },
  frontendUrl: data.FRONTEND_URL,
  corsOrigins: configuredOrigins,
  mode: envMode,
};

if (envMode === "production") {
  const required = [
    ["DATABASE_URL", data.DATABASE_URL],
    ["JWT_SECRET", data.JWT_SECRET],
    ["FRONTEND_URL or CORS_ORIGINS", configuredOrigins.length > 0 ? "configured" : ""],
    ["SUPABASE_URL", data.SUPABASE_URL],
    ["SUPABASE_SECRET_KEY", data.SUPABASE_SECRET_KEY],
  ] as const;
  const missing: string[] = required.filter(([, value]) => !value).map(([name]) => name);
  if (data.JWT_SECRET === "local_json_web_token") missing.push("JWT_SECRET (must not use the local default)");
  if (missing.length > 0) {
    throw new Error(`Production configuration incomplete: ${missing.join(", ")}`);
  }
}
