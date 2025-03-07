import { useState } from "react";
import { Track } from "../lib/spotify-api";
import { ArrowUpDown } from "lucide-react";

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
      className="cursor-pointer flex items-center"
      onClick={() => {
        setTracks([...tracks].sort((a, b) => (descending ? -1 : 1) * sortKey(a, b)));
        setDescending(!descending);
      }}
    >
      <span>{name}</span>
      <ArrowUpDown size={12} className="inline ml-1" />
    </div>
  );
}
