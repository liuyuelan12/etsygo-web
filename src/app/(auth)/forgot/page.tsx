import { getDict } from "@/lib/i18n-server";
import ResetForm from "@/components/user/ResetForm";

export default async function ForgotPage() {
  const { t } = await getDict();
  return <ResetForm t={t.auth} />;
}
