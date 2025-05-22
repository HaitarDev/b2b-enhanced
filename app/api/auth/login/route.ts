import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const supabase = await createClient();

    // 1. Sign in the user
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
    console.log({ authData, authError });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Login failed" },
        { status: 401 }
      );
    }

    // 2. Check if user is a creator and is approved
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, approved")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      // Sign out the user if profile doesn't exist
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Profile not found" }, { status: 401 });
    }

    // Check if user is a creator
    if (profile.role !== "creator") {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Access denied. This login is for creators only." },
        { status: 403 }
      );
    }

    // Check if creator is approved
    if (!profile.approved) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Your account is pending approval." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { message: "Login successful", user: authData.user },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
