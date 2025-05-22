"use client";
import React from "react";
import { ClockIcon, MailCheckIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
const PendingApproval = () => {
  const supabase = createClient();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-artist-light p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-artist-primary to-artist-dark text-2xl">
            Almost there!
          </h1>
        </div>

        <Card className="border-artist-light shadow-md text-center">
          <CardHeader>
            <div className="w-20 h-20 bg-artist-light rounded-full mx-auto flex items-center justify-center mb-4">
              <MailCheckIcon className="h-10 w-10 text-artist-primary" />
            </div>
            <CardTitle className="text-xl">
              Please verify your email address first.
            </CardTitle>
            <CardDescription className="text-sm">
              Check your inbox for a verification link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-3">
                <ClockIcon className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-lg font-medium text-gray-800">
                Application Under Review
              </p>
              <p className="text-gray-600 mt-2 text-sm font-normal">
                Once verified, your application will be reviewed. You&apos;ll
                hear back from us via email within 1–2 business days.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                supabase.auth.signOut();
              }}
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Log Out
            </Button>
            <div className="text-sm text-gray-500">
              Have questions?{" "}
              <Link
                href="#"
                className="text-artist-primary hover:text-artist-dark"
              >
                Contact support
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
export default PendingApproval;
