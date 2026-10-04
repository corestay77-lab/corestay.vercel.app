import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
    }

    const supabase = createClient(
      "https://vkejwklhijophavlosze.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing",
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }

    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const safePath = pathname.replace(/[^a-zA-Z0-9._/-]/g, "_");
        return {
          allowedContentTypes: ["application/pdf"],
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ userId: user.id }),
          pathname: `financial-reports/${user.id}/${Date.now()}-${safePath.split("/").pop() || "report.pdf"}`,
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Financial Blob upload handler failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload PDF gagal." },
      { status: 500 }
    );
  }
}
