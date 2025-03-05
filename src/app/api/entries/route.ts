import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const id = request?.nextUrl?.searchParams.get("id");

  return NextResponse.json({message: "Hello", id: id});
}