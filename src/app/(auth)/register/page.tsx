import { getDict } from "@/lib/i18n-server";
import RegisterForm from "@/components/user/RegisterForm";

export default async function RegisterPage() {
  const { t } = await getDict();
  return <RegisterForm t={t.auth} />;
}
