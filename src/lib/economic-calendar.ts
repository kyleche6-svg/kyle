import { prisma } from "@/lib/prisma";

export async function getEconomicEvents() {
  return prisma.economicEvent.findMany({
    orderBy: { eventTime: "asc" },
  });
}
