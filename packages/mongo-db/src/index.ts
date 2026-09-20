import { PrismaClient } from "@prisma/mongo/client/index.js";

const globalForPrisma = globalThis as unknown as { mongoPrisma: PrismaClient };

export const mongoPrisma =
  globalForPrisma.mongoPrisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production")
  globalForPrisma.mongoPrisma = mongoPrisma;

if (process.env.NODE_ENV === "test") {
  (mongoPrisma as any).$transaction = async (cb: any) => {
    return await cb(mongoPrisma);
  };
}

export async function ensureTtlIndex() {
  try {
    await mongoPrisma.$runCommandRaw({
      createIndexes: "Notification",
      indexes: [
        {
          key: { createdAt: 1 },
          name: "ttl_index",
          expireAfterSeconds: 1296000, // 15 days
        },
      ],
    });
    console.log("[MongoDB] TTL index on Notification.createdAt ensured.");
  } catch (error) {
    console.error(
      "[MongoDB] Failed to ensure TTL index on Notification:",
      error,
    );
  }

  try {
    await mongoPrisma.$runCommandRaw({
      createIndexes: "Invitation",
      indexes: [
        {
          key: { createdAt: 1 },
          name: "ttl_index",
          expireAfterSeconds: 2592000, // 30 days
        },
      ],
    });
    console.log("[MongoDB] TTL index on Invitation.createdAt ensured.");
  } catch (error) {
    console.error("[MongoDB] Failed to ensure TTL index on Invitation:", error);
  }
}

/**
 * Creates or updates a user reference document in MongoDB.
 * Should be called when a user logs in or registers.
 */
export async function syncUserToMongo(userId: string) {
  try {
    await mongoPrisma.userRef.upsert({
      where: { id: userId },
      update: { updatedAt: new Date() },
      create: { id: userId },
    });
  } catch (error) {
    console.error("[MongoDB] Failed to sync user reference:", error);
  }
}
