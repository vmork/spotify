import { NextResponse } from "next/server";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to get access token", details: data }, { status: 400 });
  }

  const res = NextResponse.redirect(new URL("/", req.url).toString());

  res.cookies.set("spotify_access_token", data.access_token, {
    maxAge: data.expires_in,
    path: "/",
  });

  return res;
}
