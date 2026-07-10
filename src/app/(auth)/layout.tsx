import { getDict } from "@/lib/i18n-server";
import LangSwitcher from "@/components/user/LangSwitcher";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getDict();
  return (
    <div className="relative min-h-dvh">
      <div className="absolute right-4 top-4 z-50">
        <LangSwitcher current={locale} />
      </div>
      <div className="grid min-h-dvh place-items-center px-5 py-10">{children}</div>
    </div>
  );
}
