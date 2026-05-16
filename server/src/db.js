import mongoose from "mongoose";
import { config } from "./config.js";

mongoose.set("strictQuery", true);

let connectionPromise;

function ensureRemoteMongoUri(uri) {
  if (!uri) {
    throw new Error("MONGODB_URI is required. Set it to your remote MongoDB connection string.");
  }

  const normalizedUri = uri.trim().toLowerCase();
  const withoutProtocol = normalizedUri.replace(/^mongodb(\+srv)?:\/\//, "");
  const hostsSection = withoutProtocol.split("/")[0].split("@").pop() || "";
  const hosts = hostsSection.split(",").map((host) => host.split(":")[0]);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
  const isLocalUri = hosts.some((host) => localHosts.has(host));

  if (isLocalUri) {
    throw new Error("MONGODB_URI must point to a remote MongoDB instance, not a local MongoDB server.");
  }
}

async function connectWithUri(uri) {
  ensureRemoteMongoUri(uri);
  return mongoose.connect(uri);
}

export function connectToDatabase() {
  if (!connectionPromise) {
    connectionPromise = connectWithUri(config.mongoUri).catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  return connectionPromise;
}

export async function disconnectFromDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  connectionPromise = null;
}
