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
};

export type Track = {
  id: string;
  name: string;
  artists: string[];
  album: string;
};

async function getAllPaginated<T>(
  url: string,
  token: string,
  errorMsg: string = "Failed to fetch data"
): Promise<T[]> {
  let data: T[] = [];
  let nextUrl = url;
  while (nextUrl) {
    const response = await fetch(nextUrl, {
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
  const data = await response.json();

  if (!response.ok) throw new Error(`Failed to fetch user: ${data.error.status}, ${data.error.message}`);

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
  }));

  return playlists.filter((playlist: Playlist) => playlist.owner.id === userId);
}

async function getTracksInPlaylist(token: string, playlist: Playlist): Promise<Track[]> {
  const data = await getAllPaginated<any>(
    `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
    token,
    "Failed to fetch playlist tracks"
  );

  return data.map((item: any) => {
    const track = item.track;
    return {
      id: track.id,
      name: track.name,
      artists: track.artists.map((artist: any) => artist.name),
      album: track.album.name,
    };
  });
}

async function getLikedTracks(token: string): Promise<Track[]> {
  const data = await getAllPaginated<any>(
    "https://api.spotify.com/v1/me/tracks",
    token,
    "Failed to fetch liked tracks"
  );

  return data.map((item: any) => {
    const track = item.track;
    return {
      id: track.id,
      name: track.name,
      artists: track.artists.map((artist: any) => artist.name),
      album: track.album.name,
    };
  });
}

export async function getAllUserTracks(token: string, playlists: Playlist[]): Promise<Track[]> {
  const [playlistTracks, likedTracks] = await Promise.all([
    Promise.all(playlists.map((playlist) => getTracksInPlaylist(token, playlist))),
    getLikedTracks(token),
  ]);

  const allTracks = playlistTracks.flat().concat(likedTracks);
  const uniqueTracks = Array.from(new Map(allTracks.map((track) => [track.id, track])).values());
  return uniqueTracks;
}
