import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime="nodejs";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=request.headers.get("authorization")||""; if(!auth.startsWith("Bearer "))return new NextResponse("Login diperlukan.",{status:401});
 const supabase=createClient("https://vkejwklhijophavlosze.supabase.co",process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"missing",{global:{headers:{Authorization:auth}}});
 const {data:{user}}=await supabase.auth.getUser(); if(!user)return new NextResponse("Session tidak valid.",{status:401});
 const {id}=await params; const {data,error}=await supabase.from("assessment_reports").select("file_name,pdf_base64").eq("id",id).eq("user_id",user.id).single();
 if(error||!data)return new NextResponse("Laporan tidak ditemukan.",{status:404});
 const bytes=Buffer.from(data.pdf_base64,"base64");
 return new NextResponse(bytes,{headers:{"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="CoreStay-Financial-Assessment.pdf"',"Cache-Control":"private, no-store"}});
}