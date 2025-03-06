"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlaylists, getAllUserTracks, getUser, Playlist, Track } from "../lib/spotify-api";
import { release } from "os";
import { ListHeader } from "./ListHeader";
import { cn } from "../lib/utils";

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
  });
  const playlists = playlistsQuery.data as Playlist[];
  playlists?.sort((a, b) => b.numTracks - a.numTracks);
  const totalTrackCount = playlists?.reduce((acc, playlist) => acc + playlist.numTracks, 0);

  const allTracksQuery = useQuery({
    queryKey: ["allTracks"],
    queryFn: () => getAllUserTracks(accessToken!, playlists),
    enabled: isAuthenticated && !!playlists,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const allTracks = allTracksQuery.data;

  const [searchText, setSearchText] = useState("");
  
  const [selectedPlaylists, setSelectedPlaylists] = useState<Playlist[]>([]);

  function togglePlaylistSelected(playlist: Playlist) {
    setSelectedPlaylists((playlists) =>
      playlists.includes(playlist)
        ? playlists.filter((p) => p.id !== playlist.id)
        : [...playlists, playlist]
    );
  }
  
  const [selectedTracks, setSelectedTracks] = useState<Track[]|undefined>(allTracks);

  function filterBySearch(tracks: Track[]) {
    if (!searchText.trim()) return tracks;
    return tracks.filter((track) => {
      const text = `${track.name} ${track.artists.join(" ")} ${track.releaseYear.toString()}`;
      return text.toLowerCase().includes(searchText.toLowerCase());
    });
  }
  
  function filterTracks(tracks: Track[]) {
    if (selectedPlaylists.length) {
      let ts = tracks.filter(track => selectedPlaylists.some(p => track.inPlaylists.includes(p)));
      return filterBySearch(ts);
    }
    return tracks;
  }

  useEffect(() => {
    let tracks = filterTracks(allTracks ?? []);
    tracks.sort((a, b) => a.name.localeCompare(b.name));
    setSelectedTracks(tracks);
  }, [allTracks, searchText]);

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
                {allTracks ? ` (${allTracks.length} unique)` : ""}
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-1 gap-y-1">
                {playlistsQuery.data.map((playlist) => (
                  <div
                    onClick={() => togglePlaylistSelected(playlist)}
                    className={cn("cursor-pointer bg-light-100 text-sm border border-dark-100 rounded p-0.5", 
                      selectedPlaylists.includes(playlist) && "bg-primary-100 text-light-100"
                    )}
                    key={playlist.id}
                  >
                    {playlist.name} <span className="ml-auto">({playlist.numTracks} tracks)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allTracksQuery.isLoading && <div>Loading tracks...</div>}
          {allTracksQuery.isError && (
            <div className="text-red-400">Error: {allTracksQuery.error.message}</div>
          )}
          {selectedTracks && (
            <div className="mt-2 p-2">
              <p className="text-center">{selectedTracks.length} selected tracks</p>
              <input
                type="text"
                placeholder="Search tracks"
                className="p-1 mb-2 w-[300px] border border-dark-100 rounded"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <div className="">
                {/* list headers */}
                <div className="grid grid-cols-[1fr,1fr,100px,100px] border-y border-dark-100 gap-x-1 font-semibold">
                  <ListHeader
                    name="Name"
                    sortKey={(a, b) => a.name.localeCompare(b.name)}
                    tracks={selectedTracks}
                    setTracks={setSelectedTracks}
                  />

                  <ListHeader
                    name="Playlists"
                    sortKey={(a, b) => a.inPlaylists.length - b.inPlaylists.length}
                    tracks={selectedTracks}
                    setTracks={setSelectedTracks}
                  />

                  <ListHeader
                    name="Realeased"
                    sortKey={(a, b) => a.releaseYear - b.releaseYear}
                    tracks={selectedTracks}
                    setTracks={setSelectedTracks}
                  />

                  <ListHeader
                    name="Popularity"
                    sortKey={(a, b) => a.popularity - b.popularity}
                    tracks={selectedTracks}
                    setTracks={setSelectedTracks}
                  />
                </div>

                {/* list */}
                {selectedTracks.map(
                  ({
                    id,
                    name,
                    artists,
                    album,
                    inPlaylists,
                    durationMs,
                    popularity,
                    releaseYear,
                  }) => (
                    <div className="grid grid-cols-[1fr,1fr,100px,100px] border-y gap-x-1" key={id}>
                      {/* name, artist */}
                      <div className="truncate">
                        <div className="truncate">{name}</div>
                        <div className="text-dark-200 text-sm truncate">{artists.join(", ")}</div>
                      </div>

                      {/* playlists */}
                      <div className="text-dark-200 text-sm truncate">
                        {inPlaylists.map((p) => p.name).join(", ")}
                      </div>

                      {/* year */}
                      <div className="text-sm text-dark-200">{releaseYear}</div>

                      {/* popularity */}
                      <div className="text-sm text-dark-200">{popularity}/100</div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
