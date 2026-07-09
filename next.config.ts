import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 服务端应用：主网版需要后端(API/server actions + DB + worker)。
  // 部署目标改为 Node 托管(Railway 等)，不再是静态导出。
  images: { unoptimized: true },
};

export default nextConfig;
