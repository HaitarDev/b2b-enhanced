import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// GET all support messages
export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    // Fetch all support messages
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Format the data to match the expected structure
    const formattedMessages = data.map((message) => ({
      id: message.id,
      creator: message.creator || message.name || "Unknown",
      subject: message.subject || "No subject",
      email: message.email || "",
      date: message.created_at
        ? new Date(message.created_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      status: message.status || "new",
      message: message.message || "No message content",
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error("Error fetching support messages:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
      }
    );
  }
}

// Update support message status
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { messageId, status } = body;

    if (!messageId || !status) {
      return new NextResponse(
        JSON.stringify({ error: "Message ID and status are required" }),
        {
          status: 400,
        }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated and is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    // Update support message status
    const { data, error } = await supabase
      .from("support_messages")
      .update({ status })
      .eq("id", messageId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating support message:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
      }
    );
  }
}
