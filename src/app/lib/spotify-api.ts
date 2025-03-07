export type User = {
  id: string;
  display_name: string;
};

export type Playlist = {
  id: string;
  name: string;
  description: string;
  owner: User;
  numTracks: number;
  link: string;
};

export type Track = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  inPlaylists: Playlist[];
  releaseYear: number;
  durationMs: number;
  popularity: number;
};

export async function createPlaylist(
  token: string,
  userId: string,
  name: string,
  numTracks: number
): Promise<Playlist> {
  const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok)
    throw new Error(`Failed to create playlist: ${response.status}, ${await response.text()}`);
  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    owner: data.owner,
    numTracks: numTracks,
    link: data.external_urls.spotify,
  };
}

export async function addTracksToPlaylist(token: string, playlist: Playlist, tracks: Track[]): Promise<Playlist> {
  const chunkSize = 100;
  for (let i = 0; i < tracks.length; i += chunkSize) {
    const chunk = tracks.slice(i, i + chunkSize);
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: chunk.map((track) => `spotify:track:${track.id}`),
      }),
    });
    if (!response.ok)
      throw new Error(`Failed to add tracks to playlist: ${response.status} ${await response.text()}`);
  }
  playlist.numTracks = tracks.length;
  return playlist;
}

async function getAllPaginated<T>(
  url: string,
  token: string,
  errorMsg: string = "Failed to fetch data"
): Promise<T[]> {
  let data: T[] = [];
  let nextUrl = url;
  while (nextUrl) {
    const response = await fetch(`${nextUrl}${nextUrl.includes("?") ? "&" : "?"}limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After"); // cant read on client side (cors)
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1020;
      console.log(`Rate limited, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      continue;
    }

    if (!response.ok) throw new Error(`${errorMsg}: ${response.status} ${await response.text()}`);
    const json = await response.json();
    data = data.concat(json.items);
    nextUrl = json.next;
  }
  return data;
}

export async function getUser(token: string): Promise<User> {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch user: ${response.status} ${await response.text()}`);
  const data = await response.json();
  return {
    id: data.id,
    display_name: data.display_name,
  };
}

export async function getPlaylists(token: string, userId: string): Promise<Playlist[]> {
  const data = await getAllPaginated<any>(
    "https://api.spotify.com/v1/me/playlists",
    token,
    "Failed to fetch playlists"
  );

  const playlists = data.map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    owner: item.owner,
    numTracks: item.tracks.total,
    link: item.external_urls.spotify,
  }));

  return playlists.filter((playlist: Playlist) => playlist.owner.id === userId);
}

function parseApiTrack(item: any, playlist: Playlist) {
  const track = item.track;
  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map((artist: any) => artist.name),
    album: track.album.name,
    inPlaylists: [playlist],
    durationMs: track.duration_ms,
    releaseYear: new Date(track.album.release_date).getFullYear(),
    popularity: track.popularity,
  };
}

async function getTracksInPlaylist(token: string, playlist: Playlist): Promise<Track[]> {
  const data = await getAllPaginated<any>(
    `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
    token,
    "Failed to fetch playlist tracks"
  );

  return data.map((item: any) => parseApiTrack(item, playlist));
}

async function getLikedTracks(token: string): Promise<Track[]> {
  const data = await getAllPaginated<any>(
    "https://api.spotify.com/v1/me/tracks",
    token,
    "Failed to fetch liked tracks"
  );

  const likedTracksPlaylist = {
    id: "liked-tracks",
    name: "Gillade låtar",
    description: "",
    owner: { id: "me", display_name: "me" },
    numTracks: data.length,
    link: "https://open.spotify.com/collection/tracks",
  };

  return data.map((item: any) => parseApiTrack(item, likedTracksPlaylist));
}

export async function getAllUserTracks(token: string, playlists: Playlist[]): Promise<Track[]> {
  const [playlistTracks, likedTracks] = await Promise.all([
    Promise.all(playlists.map((playlist) => getTracksInPlaylist(token, playlist))),
    getLikedTracks(token),
  ]);
  const allTracks = playlistTracks.flat().concat(likedTracks);

  // Deduplicate tracks and merge inPlaylists
  const uniqueTracks = new Map<string, Track>();
  allTracks.forEach((track) => {
    if (!uniqueTracks.has(track.id)) {
      uniqueTracks.set(track.id, track);
    } else {
      const existingTrack = uniqueTracks.get(track.id)!;
      track.inPlaylists.forEach((playlist) => {
        if (!existingTrack.inPlaylists.some((p) => p.id === playlist.id)) {
          existingTrack.inPlaylists.push(playlist);
        }
      });
    }
  });

  return Array.from(uniqueTracks.values());
}
