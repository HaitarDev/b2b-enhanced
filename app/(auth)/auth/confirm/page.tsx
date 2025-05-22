"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function ConfirmPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get params from URL directly
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get("token_hash");
    const type = params.get("type");

    const confirmEmail = async () => {
      if (token_hash && type) {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: "email",
          });

          if (error) throw error;
          router.push("/pending-approval");
        } catch (error) {
          console.error("Error verifying email:", error);
          router.push("/login?error=verification-failed");
        } finally {
          setIsLoading(false);
        }
      }
    };

    confirmEmail();
  }, [router, supabase.auth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-artist-light">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">
            Verifying your email...
          </h2>
          <p className="mt-2 text-gray-600">
            Please wait while we confirm your email address.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
