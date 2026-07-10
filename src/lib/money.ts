import { Prisma } from "@prisma/client";

// 金额一律用 Decimal 运算，杜绝 JS 浮点在 18 位精度下的漂移。
// Prisma.Decimal 即 decimal.js：支持 .add/.sub/.mul/.div/.gte/.lte/.gt/.neg/.toFixed 等。
export type Money = Prisma.Decimal;

export const D = (v: Prisma.Decimal.Value): Prisma.Decimal => new Prisma.Decimal(v);
export const ZERO = new Prisma.Decimal(0);

// 求和一组 Decimal
export function sum(values: Prisma.Decimal.Value[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((acc, v) => acc.add(v), new Prisma.Decimal(0));
}
