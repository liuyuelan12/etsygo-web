import { getDict } from "@/lib/i18n-server";
import LoginForm from "@/components/user/LoginForm";

export default async function LoginPage() {
  const { t } = await getDict();
  return <LoginForm t={t.auth} />;
}
