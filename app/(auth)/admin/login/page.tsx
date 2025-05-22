"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, LogIn, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const adminLoginSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters",
  }),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

const AdminLogin = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const form = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: AdminLoginFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Login failed");
      }

      // 2. Verify user is an admin by checking the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profileError) {
        // Sign out the user since they're not properly set up
        await supabase.auth.signOut();
        throw new Error("Failed to verify admin status");
      }

      if (profileData?.role !== "admin") {
        // Sign out the user since they're not an admin
        await supabase.auth.signOut();
        throw new Error("You do not have admin privileges");
      }

      // 3. Successfully authenticated as admin
      toast({
        title: "Login Successful",
        description: "Welcome to the admin dashboard!",
      });

      // Redirect to admin dashboard
      router.push("/admin");
    } catch (error) {
      let errorMessage = "Invalid email or password";

      if (error instanceof Error) {
        if (error.message === "You do not have admin privileges") {
          errorMessage = "You do not have admin privileges";
        } else if (error.message === "Invalid login credentials") {
          errorMessage = "Invalid email or password";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
      console.error("Admin login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-artist-light">
      <header className="w-full px-4 flex justify-center items-center py-[15px]">
        <Link href="/">
          <img
            src="https://cdn.shopify.com/s/files/1/0759/0913/6701/files/b2bdeinspar.svg?v=1744817176"
            alt="B2B DEINSPAR"
            className="h-5 w-auto"
          />
        </Link>
      </header>
      <Separator className="bg-gray-200" />

      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-artist-light shadow-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Admin Login</CardTitle>
              <CardDescription className="text-slate-950 text-sm">
                Access the Deinspar Admin Dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                              placeholder="admin@example.com"
                              className="pl-10"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                              type="password"
                              placeholder="••••••"
                              className="pl-10"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Log In
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <div className="text-sm text-center w-full">
                <Link
                  href="/forgot-password"
                  className="text-artist-primary hover:text-artist-dark"
                >
                  Forgot your password?
                </Link>
              </div>
              <div className="text-sm text-center w-full">
                <Link
                  href="/login"
                  className="text-artist-primary hover:text-artist-dark font-medium"
                >
                  Back to Creator Login
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      <footer className="bg-white py-8 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="mb-4 font-normal text-xs">B2B DEINSPAR © 2025</p>
            <div className="flex gap-2 text-sm flex-wrap justify-center">
              <a
                href="mailto:b2b@deinspar.com"
                className="text-artist-primary hover:text-artist-dark"
              >
                Contact
              </a>
              <span className="text-gray-300">|</span>
              <a
                href="https://deinspar.com/policies/privacy-policy"
                className="text-artist-primary hover:text-artist-dark"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
              <span className="text-gray-300">|</span>
              <a
                href="https://deinspar.com/policies/terms-of-service"
                className="text-artist-primary hover:text-artist-dark"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminLogin;
