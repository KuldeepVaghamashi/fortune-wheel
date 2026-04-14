import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB ?? "random-wheel-selector";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 2000,
    connectTimeoutMS: 2000,
    maxPoolSize: 3,
  });
  const promise = client.connect();
  // Clear the cache on failure so the next request retries fresh
  promise.catch(() => {
    global._mongoClientPromise = undefined;
  });
  return promise;
}

export async function getDb() {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  const client = await global._mongoClientPromise;
  return client.db(dbName);
}
