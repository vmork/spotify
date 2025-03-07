"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getAllUserTracks, getPlaylists, getUser, Playlist, Track } from "../lib/spotify-api";
import { cn } from "../lib/utils";
import { CreatePlaylistButton } from "./CreatePlaylistButton";
import { ListHeader } from "./ListHeader";

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
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

  const [selectedTracks, setSelectedTracks] = useState<Track[] | undefined>(allTracks);

  function filterBySearch(tracks: Track[]) {
    if (!searchText.trim()) return tracks;
    return tracks.filter((track) => {
      const text = `${track.name} ${track.artists.join(" ")} ${track.releaseYear.toString()}`;
      return text.toLowerCase().includes(searchText.toLowerCase());
    });
  }

  function filterByPlaylists(tracks: Track[]) {
    if (selectedPlaylists.length === 0) return tracks;
    return tracks.filter((track) =>
      selectedPlaylists.some((playlist) => track.inPlaylists.some((p) => p.id === playlist.id))
    );
  }

  function filterTracks(tracks: Track[]) {
    return filterBySearch(filterByPlaylists(tracks));
  }

  useEffect(() => {
    let tracks = filterTracks(allTracks ?? []);
    tracks.sort((a, b) => a.name.localeCompare(b.name));
    setSelectedTracks(tracks);
  }, [allTracks, searchText, selectedPlaylists]);

  function onCreatePlaylist(playlist: Playlist, tracks: Track[]) {
    console.log(playlist);
    queryClient.setQueryData(["playlists"], (oldPlaylists: Playlist[]) => [
      ...oldPlaylists,
      playlist,
    ]);
    queryClient.setQueryData(["allTracks"], (oldTracks: Track[]) =>
      oldTracks.map((t) =>
        tracks.some((track) => track.id === t.id)
          ? { ...t, inPlaylists: [...t.inPlaylists, playlist] }
          : t
      )
    );

    setSelectedPlaylists([playlist]);
  }

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
          {/* User info */}
          {userQuery.isLoading && <div>Loading user...</div>}
          {userQuery.isError && (
            <div className="text-red-400">Error: {userQuery.error.message}</div>
          )}
          {user && (
            <div className="text-center">
              <h1 className="text-3xl font-bold text-primary-100">Logged in as {user.display_name}</h1>
            </div>
          )}

          {/* Playlists */}
          {playlistsQuery.isLoading && <div>Loading playlists...</div>}
          {playlistsQuery.isError && (
            <div className="text-red-400">Error: {playlistsQuery.error.message}</div>
          )}
          {playlists && (
            <div className="p-2 text-center">
              <p className="mb-2 font-semibold">
                {playlists.length} playlists with {totalTrackCount} tracks
                {allTracks ? ` (${allTracks.length} unique)` : ""}
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-1 gap-y-1">
                {playlists.map((playlist) => (
                  <div
                    onClick={() => togglePlaylistSelected(playlist)}
                    className={cn(
                      "cursor-pointer bg-light-200 text-sm border rounded p-0.5",
                      selectedPlaylists.includes(playlist) && "bg-primary-100 text-light-100"
                    )}
                    key={playlist.id}
                  >
                    {playlist.name}{" "}
                    <span
                      className={cn(
                        "ml-auto text-dark-200",
                        selectedPlaylists.includes(playlist) && "text-light-200"
                      )}
                    >
                      ({playlist.numTracks} tracks)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tracks */}
          {allTracksQuery.isLoading && <div>Loading tracks...</div>}
          {allTracksQuery.isError && (
            <div className="text-red-400">Error: {allTracksQuery.error.message}</div>
          )}
          {selectedTracks && (
            <div className="mt-2 p-2">
              {/* Top bar */}
              <div className="flex flex-col mb-2">
                <input
                  type="text"
                  placeholder="Search tracks"
                  className="p-1 mb-2 max-w-[350px] border border-dark-100 rounded"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />


                <div className="flex items-center">
                  <span className="text-primary-100 text-lg">{selectedTracks.length} selected tracks</span>
                  
                  {user && (
                    <div className="ml-auto w-max">
                      <CreatePlaylistButton
                        key={selectedTracks.map((track) => track.id).join(",")}
                        tracks={selectedTracks ?? []}
                        token={accessToken}
                        userId={user.id}
                        onCreate={onCreatePlaylist}
                      />
                    </div>
                  )}
                </div>
              </div>


              {/* List headers */}
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

              {/* List */}
              {selectedTracks.map((track) => (
                <div
                  className="grid grid-cols-[1fr,1fr,100px,100px] border-y gap-x-1"
                  key={track.id}
                >
                  {/* name, artist */}
                  <div className="truncate">
                    <div className="truncate">{track.name}</div>
                    <div className="text-dark-200 text-sm truncate">{track.artists.join(", ")}</div>
                  </div>

                  {/* playlists */}
                  <div className="text-dark-200 text-sm truncate">
                    {track.inPlaylists.map((pp) => pp.name).join(", ")}
                  </div>

                  {/* year */}
                  <div className="text-sm text-dark-200">{track.releaseYear}</div>

                  {/* popularity */}
                  <div className="text-sm text-dark-200">{track.popularity}/100</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
