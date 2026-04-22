import mongoose from "mongoose"
import { env } from "./env"

export async function connectDB() { 
    if(!env.MONGODB_URI) throw new Error("mongodb URI not set");
    await mongoose.connect(env.MONGODB_URI,{dbName: env.MONGODB_DB_NAME});
    console.log("mogodb connected");
}