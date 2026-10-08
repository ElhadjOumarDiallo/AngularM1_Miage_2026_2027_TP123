/** Audio track metadata returned by the API. */
export interface Track {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  size: number;
  coverUrl?: string;
  artist?: string;
  createdAt: string;
}

/** Cover artwork suggestion returned by web search. */
export interface CoverSuggestion {
  artist: string;
  title: string;
  album: string;
  coverUrl: string;
}
