import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="flex justify-center">
          <div className="relative h-5 w-[120px]">
            <Image
              src="/logo.svg"
              alt="Deinspar Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>
        <LoginForm />
      </div>
    </div>
  );
}
