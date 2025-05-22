import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AdminForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/40 bg-gradient-to-b from-background to-muted/10 backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Admin Portal</CardTitle>
          <CardDescription>Access your Deinspar admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="relative text-center text-sm">
              <span className="bg-background px-2 text-muted-foreground relative z-10">Admin authentication</span>
              <div className="absolute inset-0 flex items-center">
                <div className="border-t border-border w-full" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@deinspar.com" required className="rounded-md" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required className="rounded-md" />
              </div>
              <Button
                type="submit"
                className="w-full rounded-full h-10 bg-black text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Log in
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
