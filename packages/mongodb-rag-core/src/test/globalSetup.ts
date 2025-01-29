import { MongoMemoryServer, MongoMemoryReplSet } from "mongodb-memory-server";
import { IP, REPLICA_SET_PORT, SERVER_PORT } from "./constants";

export default async function () {
  try {
    const mongoMemoryServerInstance = await MongoMemoryServer.create({
      instance: {
        port: SERVER_PORT,
        ip: IP,
      },
    });
    (global as any).__MONGO_MEMORY_SERVER_INSTANCE = mongoMemoryServerInstance;

    const mongoMemoryServerReplicaSet = await MongoMemoryReplSet.create({
      instanceOpts: [
        {
          port: REPLICA_SET_PORT,
        },
      ],
      replSet: {
        ip: IP,
      },
    });
    (global as any).__MONGO_MEMORY_REPLICA_SET = mongoMemoryServerReplicaSet;
  } catch (error) {
    console.error("Error in global setup:", error);
    throw error;
  }
}

export {};
