import { PrismaClient } from "@prisma/client";
export const db = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
  ],
});

const LOG_QUERY = false;
db.$on("query", async (e: any) => {
  if (LOG_QUERY) {
    console.log("\n----- Query Start -----\n");
    console.log(`${e.query} ${e.params}`);
    console.log("\n----- Query End -----\n");
  }
});
