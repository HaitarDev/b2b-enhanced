import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message, userId } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated (optional, as support might come from non-logged in users too)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If userId was provided, make sure it matches the authenticated user
    if (userId && (!user || user.id !== userId)) {
      return NextResponse.json(
        { error: "Unauthorized user ID provided" },
        { status: 401 }
      );
    }

    // Insert support message into the database
    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        name,
        email,
        subject,
        message,
        user_id: userId || user?.id || null, // Use provided ID, authenticated user ID, or null
        status: "new", // Set initial status
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating support message:", error);
      return NextResponse.json(
        { error: "Failed to submit support message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Support message submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Error handling support message submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
