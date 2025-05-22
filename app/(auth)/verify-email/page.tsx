"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function VerifyEmail() {
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get params from URL after component mounts (client-side only)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setEmail(params.get("email"));
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-artist-light">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">
            Loading verification...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-artist-light p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-artist-primary to-artist-dark text-2xl">
            Check your email
          </h1>
        </div>

        <Card className="border-artist-light shadow-md text-center">
          <CardHeader>
            <div className="w-20 h-20 bg-artist-light rounded-full mx-auto flex items-center justify-center mb-4">
              <MailIcon className="h-10 w-10 text-artist-primary" />
            </div>
            <CardTitle className="text-xl">Verify your email address</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mt-4">
              We&apos;ve sent a verification link to:
            </p>
            <p className="font-medium text-artist-primary mt-2">
              {email || "your email"}
            </p>
            <p className="text-gray-600 mt-4 text-sm">
              Click the link in the email to verify your account and continue
              with the registration process.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
            <div className="text-sm text-gray-500">
              Didn&apos;t receive the email?{" "}
              <Button
                variant="link"
                className="text-artist-primary hover:text-artist-dark p-0"
              >
                Resend verification email
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
