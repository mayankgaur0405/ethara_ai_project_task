import { MongoMemoryServer } from "mongodb-memory-server";

const mongoServer = await MongoMemoryServer.create({
  instance: {
    ip: "127.0.0.1",
    port: 27017,
    dbName: "ethara_task_manager"
  }
});

console.log(`Dev MongoDB running at ${mongoServer.getUri()}`);

const shutdown = async () => {
  await mongoServer.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

setInterval(() => {}, 60_000);
