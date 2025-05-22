"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, LogIn, Loader2 } from "lucide-react";
import Link from "next/link";
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
import Image from "next/image";
const loginSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters",
  }),
});
type LoginFormValues = z.infer<typeof loginSchema>;
const Login = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login failed");
      }

      // Successful login
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to your account.",
      });

      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "An error occurred during login",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-artist-light">
      <header className="w-full flex justify-center items-center py-[15px] px-4">
        <div className="container mx-auto">
          <Image
            width={100}
            height={100}
            src="https://cdn.shopify.com/s/files/1/0759/0913/6701/files/b2bdeinspar.svg?v=1744817176"
            alt="B2B DEINSPAR"
            className="h-5 w-auto cursor-pointer"
            onClick={() => router.push("/")}
          />
        </div>
      </header>
      <Separator className="bg-gray-200" />

      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="container mx-auto max-w-md">
          <Card className="border-artist-light shadow-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Login</CardTitle>
              <CardDescription className="text-slate-950 text-sm">
                Access your Deinspar business account
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                              placeholder="email@example.com"
                              className="pl-10"
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
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-artist-primary hover:text-artist-dark font-medium"
                >
                  Register here
                </Link>
              </div>
              <div className="text-sm text-center w-full mt-4">
                <Link
                  href="/admin/login"
                  className="text-artist-primary hover:text-artist-dark font-medium border-t border-gray-200 pt-4 block"
                >
                  Are you an admin? Log in here
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
export default Login;
