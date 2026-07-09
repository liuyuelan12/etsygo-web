import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { getDict } from "@/lib/i18n-server";
import TabBar from "@/components/user/TabBar";
import LangSwitcher from "@/components/user/LangSwitcher";
import Web3Provider from "@/components/Web3Provider";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const uid = await getSessionUserId();
  if (!uid) redirect("/login");
  const { locale, t } = await getDict();
  return (
    <Web3Provider>
      <div className="phone flex flex-col">
        <div className="flex items-center justify-end px-4 pt-3">
          <LangSwitcher current={locale} />
        </div>
        <div className="flex-1 pb-2">{children}</div>
        <TabBar labels={t.nav} />
      </div>
    </Web3Provider>
  );
}
