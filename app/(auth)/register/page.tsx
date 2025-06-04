import Link from "next/link";
import Image from "next/image";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link href="/" className="self-center">
          <div className="relative h-4 w-[120px]">
            <Image
              src="/logo.svg"
              alt="Deinspar Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>
        <SignupForm />
      </div>
    </div>
  );
}
