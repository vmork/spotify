import { NextResponse } from "next/server";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!;
const SCOPE = "playlist-read-private playlist-read-collaborative user-library-read playlist-modify-public playlist-modify-private";

export async function GET() {  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    state: Math.random().toString(36).substring(7)
  });

  const authUrl = `${SPOTIFY_AUTH_URL}?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
