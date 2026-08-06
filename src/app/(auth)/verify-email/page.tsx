import Link from "next/link";
import { VerifyEmailForm } from "@/components/VerifyEmailForm";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-6 py-20">
        <h1 className="text-2xl font-semibold">Invalid link</h1>
        <p className="mt-2 text-sm text-muted">
          This verification link is missing its token.{" "}
          <Link href="/account" className="text-accent">
            Go to your account
          </Link>{" "}
          to request a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-2xl font-semibold">Verify your email</h1>
      <VerifyEmailForm token={token} />
    </div>
  );
}
