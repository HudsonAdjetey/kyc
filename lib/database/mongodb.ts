import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  } | undefined;
}

const cached = global._mongoose || { conn: null, promise: null };
global._mongoose = cached;

export async function connectToDatabase(): Promise<mongoose.Connection> {
  if (cached.conn) {
    console.log("🔥 Using existing MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("Establishing new MongoDB connection...");
    const options: mongoose.ConnectOptions = { 
      bufferCommands: false 
    };

    cached.promise = mongoose
      .connect(MONGODB_URI!, options)
      .then((mongoose) => {
        console.log("MongoDB connected successfully");
        return mongoose.connection;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error("MongoDB connection error:", error);
    throw error;
  }

  return cached.conn;
}