import dotenv from "dotenv";
dotenv.config();

export const env ={
    PORT: process.env.PORT ?? "5000",
    vercel_url: process.env.vercel_url ?? "",
    MONGODB_URI: process.env.MONGODB_URI ?? "",
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME ?? "",
    JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "1d"
}