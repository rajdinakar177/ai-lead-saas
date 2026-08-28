import { VerifyEmail } from "@/components/auth/verify-email";

type PageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: PageProps) {
  const { token } =
    await searchParams;

  return (
    <VerifyEmail
      token={token ?? ""}
    />
  );
}