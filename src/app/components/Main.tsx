"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlaylists, getAllUserTracks, getUser, Playlist, Track } from "../lib/spotify-api";

export default function Main() {
  const queryClient = useQueryClient();

  const [accessToken, setAccessToken] = useState<string>();
  const isAuthenticated = !!accessToken;

  useEffect(() => {
    const token = document.cookie
      .split(";")
      .find((c) => c.startsWith("spotify_access_token="))
      ?.split("=")[1];
    setAccessToken(token);
  }, []);

  const userQuery = useQuery({
    queryKey: ["user"],
    queryFn: () => getUser(accessToken!),
    enabled: isAuthenticated,
    retry: false,
  });
  const user = userQuery.data;

  const playlistsQuery = useQuery({
    queryKey: ["playlists"],
    queryFn: () => getPlaylists(accessToken!, user!.id),
    enabled: isAuthenticated && !!user,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const playlists = playlistsQuery.data as Playlist[];
  playlists?.sort((a, b) => b.numTracks - a.numTracks);
  const totalTrackCount = playlists?.reduce((acc, playlist) => acc + playlist.numTracks, 0);

  const allTracksQuery = useQuery({
    queryKey: ["allTracks"],
    queryFn: () => getAllUserTracks(accessToken!, playlists),
    enabled: isAuthenticated && !!playlists,
    retry: false,
  });
  const allTracks = allTracksQuery.data;
  allTracks?.sort((a, b) => a.name.localeCompare(b.name));

  const [searchText, setSearchText] = useState("");

  function filterBySearch(tracks: Track[], searchText: string) {
    if (!searchText.trim()) return tracks;
    return tracks.filter((track) => {
      const text = `${track.name} ${track.artists.join(" ")} ${track.album}`;
      return text.toLowerCase().includes(searchText.toLowerCase());
    });
  }

  const filteredTracks = filterBySearch(allTracks ?? [], searchText);

  return (
    <div>
      {!accessToken ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <button className="bg-primary-100 p-2 rounded text-light-100 text-xl">
            <Link href={"/api/login"}>Login with spotify</Link>
          </button>
        </div>
      ) : (
        <>
          {userQuery.isLoading && <div>Loading user...</div>}
          {userQuery.isError && (
            <div className="text-red-400">Error: {userQuery.error.message}</div>
          )}
          {user && (
            <div className="text-center">
              <h1 className="text-3xl font-bold">Logged in as {user.display_name}</h1>
            </div>
          )}

          {playlistsQuery.isLoading && <div>Loading playlists...</div>}
          {playlistsQuery.isError && (
            <div className="text-red-400">Error: {playlistsQuery.error.message}</div>
          )}
          {playlistsQuery.data && (
            <div className="p-2 text-center">
              <p>
                {playlists.length} playlists with {totalTrackCount} tracks
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-1 gap-y-1">
                {playlistsQuery.data.map(({ id, name, numTracks }) => (
                  <div
                    className="bg-light-100 text-sm border border-dark-100 rounded p-0.5"
                    key={id}
                  >
                    {name} <span className="text-dark-200">({numTracks} tracks)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allTracksQuery.isLoading && <div>Loading tracks...</div>}
          {allTracksQuery.isError && (
            <div className="text-red-400">Error: {allTracksQuery.error.message}</div>
          )}
          {allTracks && (
            <div className="mt-2 p-2">
              <p className="text-center">{allTracks.length} unique tracks</p>
              <input type="text" 
                placeholder="Search tracks" 
                className="p-1 m-1 border border-dark-100 rounded" 
                value={searchText} 
                onChange={(e) => setSearchText(e.target.value)}
              />
              <div className="">
                {filteredTracks.map(({ id, name, artists, album }) => (
                  <div className="grid grid-cols-[1fr,1fr] border-y" key={id}>
                    <div className="truncate">{name}</div>
                    <div className="text-dark-200 text-sm truncate">{album}</div>
                    <div className="text-dark-200 text-sm truncate">{artists.join(", ")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
