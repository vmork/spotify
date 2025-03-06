import { useState } from "react";
import { Track } from "../lib/spotify-api";

export function ListHeader({
  name,
  sortKey,
  tracks,
  setTracks,
}: {
  name: string;
  sortKey: (a: Track, b: Track) => number;
  tracks: Track[]
  setTracks: (tracks: Track[]) => void;
}) {
  const [descending, setDescending] = useState(false);
  return (
    <div
      className="cursor-pointer"
      onClick={() => {
        setTracks([...tracks].sort((a, b) => (descending ? -1 : 1) * sortKey(a, b)));
        setDescending(!descending);
      }}
    >
      {name}
    </div>
  );
}
