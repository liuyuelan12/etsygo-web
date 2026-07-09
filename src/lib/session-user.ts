import { getSessionUserId } from "./auth";
import { prisma } from "./db";

export async function getCurrentUser() {
  const uid = await getSessionUserId();
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid }, include: { balance: true } });
}
