import { Track, Playlist } from "../lib/spotify-api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { cn } from "../lib/utils";
import { createPlaylist, addTracksToPlaylist } from "../lib/spotify-api";
import Link from "next/link";

export function CreatePlaylistButton({
  tracks,
  token,
  userId,
  onCreate,
}: {
  tracks: Track[];
  token: string;
  userId: string;
  onCreate: (playlist: Playlist, tracks: Track[]) => void;
}) {
  const [name, setName] = useState("");
  const [displayPopup, setDisplayPopup] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const playlist = await createPlaylist(token, userId, name, tracks.length);
      await addTracksToPlaylist(token, playlist, tracks);
      return playlist;
    },
    onSuccess: (playlist) => {
      onCreate(playlist, tracks);
    },
  });

  const playlist = mutation.data;

  const createDisabled = !name.trim() || mutation.isPending || mutation.isSuccess;

  return (
    <div className="relative">
      <button
        className={cn(
          "text-light-100 rounded-sm px-2 py-1",
          displayPopup ? "bg-dark-200" : "bg-primary-100"
        )}
        onClick={() => {
          setDisplayPopup(!displayPopup);
        }}
      >
        {displayPopup ? <span>Cancel</span> : <span>Create playlist</span>}
      </button>

      {displayPopup && (
        <div className="absolute bg-light-200 border border-dark-100 shadow-lg p-1 rounded bottom-9 right-0 flex flex-col gap-1">
          <input
            className="bg-primary-200 p-1 rounded w-max border-none focus:outline-none"
            placeholder="Playlist name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            disabled={createDisabled}
            className={cn(
              "bg-primary-100 text-light-100 px-1 rounded-sm w-max max-w-[300px]",
              createDisabled && "opacity-50 cursor-not-allowed",
              mutation.isError && "bg-red-500"
            )}
            onClick={() => {
              mutation.mutate();
            }}
          >
            {mutation.isPending ? (
              <span>Creating...</span>
            ) : mutation.isSuccess ? (
              <span>
                Created{" "}
                <Link
                  className="underline"
                  href={playlist!.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {playlist!.name} ({playlist!.numTracks} tracks)
                </Link>
              </span>
            ) : mutation.isError ? (
              <span>Error: {mutation.error.message}</span>
            ) : (
              <span>Create playlist with {tracks.length} tracks</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
