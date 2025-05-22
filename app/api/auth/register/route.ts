import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, country, instagram, portfolio, bio } = body;

    const supabase = await createClient();

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: {
          email,
          name,
          role: "creator",
          country,
          instagram: instagram || null,
          portfolio: portfolio || null,
          bio: bio || null,
          approved: false, // Creators need approval
        },
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Registration failed" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Registration successful", userId: authData.user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
