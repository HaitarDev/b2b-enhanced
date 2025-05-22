import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const size = formData.get("size") as string;
    const file = formData.get("file") as File;

    if (!file || !size) {
      return NextResponse.json(
        { error: "File and size are required" },
        { status: 400 }
      );
    }

    // Get the user session from server client
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Create a unique file path
    const fileExt = file.name.split(".").pop();
    const fileName = `${size}_${Math.random()
      .toString(36)
      .substring(2, 15)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Check if bucket exists, create if not
    // const { data: buckets } = await supabase.storage.listBuckets();
    // const posterBucket = buckets?.find(
    //   (bucket) => bucket.name === "poster-images"
    // );

    // if (!posterBucket) {
    //   const { error: bucketError } = await supabase.storage.createBucket(
    //     "poster-images",
    //     {
    //       public: true,
    //       fileSizeLimit: 10485760, // 10MB
    //     }
    //   );

    //   if (bucketError) {
    //     return NextResponse.json(
    //       { error: `Failed to create bucket: ${bucketError.message}` },
    //       { status: 500 }
    //     );
    //   }
    // }

    const { error } = await supabase.storage
      .from("poster-images")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("poster-images")
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      size,
      path: filePath,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
