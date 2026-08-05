import { prisma } from "@/lib/prisma";

export async function getTrackedPosts(limit = 20) {
  return prisma.post.findMany({
    orderBy: { postedAt: "desc" },
    take: limit,
    include: {
      trackedFigure: true,
      priceSnapshots: true,
    },
  });
}
