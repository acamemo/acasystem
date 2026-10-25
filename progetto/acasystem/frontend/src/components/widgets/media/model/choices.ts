/**
 * Media choices for the «Scegli contenuto» panel: normalisation of HA browse nodes and of the
 * Sonos favourite/playlist attributes, and the breadth-first browse of MediaModal/MediaPage
 * (same filters, buckets, depth 4 and 18 expansions).
 */
import type { HaMessageConnection } from '@/@types/ha';

export interface MediaChoice {
  id: string;
  label: string;
  type: string;
  source: string;
  image: string | null;
}

export type ChoiceBucket = 'favorites' | 'playlists' | 'library';

export interface BrowseChoices {
  favorites: MediaChoice[];
  playlists: MediaChoice[];
  library: MediaChoice[];
}

type BrowseNode = Record<string, unknown>;

const BLOCKED_MEDIA_TYPES = new Set([
  'camera',
  'image',
  'video',
  'tvshow',
  'movie',
  'channel',
  'game',
  'app',
  'photo',
  'picture',
  'url',
]);

const BLOCKED_ID_PATTERNS = [
  'camera.',
  'camera/',
  'image.',
  'image/',
  'media-source://camera',
  'media-source://image',
  'media-source://dlna',
  'media-source://local',
];

const BLOCKED_TITLE_WORDS = [
  'camera',
  'kamera',
  'webcam',
  'surveillance',
  'doorbell',
  'security cam',
  'cctv',
];

const isRecord = (value: unknown): value is BrowseNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';

const firstText = (node: BrowseNode, keys: readonly string[]): string => {
  for (const key of keys) {
    const value = text(node[key]);
    if (value) return value;
  }
  return '';
};

export function inferSourceFromId(value: unknown): string {
  const id = text(value).toLowerCase();
  if (!id) return '';
  if (id.includes('spotify')) return 'Spotify';
  if (id.includes('music_assistant') || id.includes('mass')) return 'Music Assistant';
  if (id.includes('sonos')) return 'Sonos';
  if (id.includes('plex')) return 'Plex';
  if (id.includes('tidal')) return 'TIDAL';
  if (id.includes('youtube')) return 'YouTube';
  if (id.includes('radio')) return 'Radio';
  return '';
}

export function normalizeChoice(item: unknown, fallbackType: string): MediaChoice | null {
  if (typeof item === 'string') {
    const value = item.trim();
    if (!value) return null;
    return {
      id: value,
      label: value,
      type: fallbackType,
      source: inferSourceFromId(value),
      image: null,
    };
  }
  if (!isRecord(item)) return null;
  const idValue = [
    item.media_content_id,
    item.id,
    item.uri,
    item.url,
    item.entity_id,
    item.value,
  ].find(Boolean);
  if (typeof idValue !== 'string') return null;
  const label = firstText(item, ['title', 'name', 'friendly_name', 'label']) || idValue;
  const type = firstText(item, ['media_content_type', 'type']) || fallbackType;
  const source =
    firstText(item, [
      'provider',
      'source',
      'app_name',
      'media_source',
      'integration',
      'library_name',
      'domain',
    ]) || inferSourceFromId(idValue);
  const image =
    firstText(item, [
      'thumbnail',
      'thumb',
      'image',
      'icon',
      'entity_picture',
      'media_image',
      'media_image_url',
    ]) || null;
  return { id: idValue, label, type, source, image };
}

/** Normalises and removes duplicates by type and id, keeping the first occurrence. */
export function normalizeChoices(raw: unknown, fallbackType: string): MediaChoice[] {
  const list = Array.isArray(raw) ? raw : [];
  const unique = new Map<string, MediaChoice>();
  list.forEach((item) => {
    const choice = normalizeChoice(item, fallbackType);
    if (!choice) return;
    const key = `${choice.type}::${choice.id}`;
    if (!unique.has(key)) unique.set(key, choice);
  });
  return [...unique.values()];
}

export const mergeChoices = (...lists: MediaChoice[][]): MediaChoice[] =>
  normalizeChoices(lists.flat(), 'music');

export function isMusicContent(node: unknown): boolean {
  if (!isRecord(node)) return false;
  const type = firstText(node, ['media_content_type', 'media_class', 'type']).toLowerCase();
  const id = firstText(node, ['media_content_id', 'id', 'uri']).toLowerCase();
  const title = firstText(node, ['title', 'name']).toLowerCase();
  const browsableContainer =
    node.can_expand === true && ['', 'app', 'directory', 'folder'].includes(type);
  if (BLOCKED_MEDIA_TYPES.has(type) && !browsableContainer) return false;
  if (BLOCKED_ID_PATTERNS.some((pattern) => id.includes(pattern))) return false;
  if (BLOCKED_TITLE_WORDS.some((word) => title.includes(word))) return false;
  return true;
}

const normalizeBrowseText = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function nodeMatches(node: BrowseNode, terms: readonly string[]): boolean {
  const haystack = normalizeBrowseText(
    ['title', 'name', 'media_content_type', 'media_class', 'media_content_id', 'id']
      .map((key) => text(node[key]))
      .filter(Boolean)
      .join(' ')
  );
  return terms.some((term) => haystack.includes(term));
}

const isFavoriteNode = (node: BrowseNode) =>
  nodeMatches(node, ['favorite', 'favourite', 'favorit', 'favoritt']);
const isPlaylistNode = (node: BrowseNode) =>
  nodeMatches(node, ['playlist', 'spilleliste', 'speleliste', 'spellista']);

function resolveBucket(node: BrowseNode, inherited: ChoiceBucket = 'library'): ChoiceBucket {
  if (isFavoriteNode(node)) return 'favorites';
  if (isPlaylistNode(node)) return 'playlists';
  return inherited;
}

interface FrontierEntry {
  node: BrowseNode;
  bucket: ChoiceBucket;
  sourceHint: string;
}

const children = (node: unknown): BrowseNode[] =>
  isRecord(node) && Array.isArray(node.children) ? node.children.filter(isRecord) : [];

const BUCKET_PRIORITY: Record<ChoiceBucket, number> = { favorites: 0, playlists: 1, library: 2 };

/**
 * Browses the player's media tree (`media_player/browse_media`) and sorts the playable items
 * into favourites, playlists and library. Throws when the root cannot be read.
 */
export async function browseMediaChoices(
  conn: HaMessageConnection,
  entityId: string,
  isCancelled: () => boolean = () => false
): Promise<BrowseChoices> {
  const browseNode = async (node: BrowseNode | null = null): Promise<unknown> => {
    const payload: { type: string; [key: string]: unknown } = {
      type: 'media_player/browse_media',
      entity_id: entityId,
    };
    const contentType = node ? text(node.media_content_type) : '';
    const contentId = node ? text(node.media_content_id) : '';
    if (contentType) payload.media_content_type = contentType;
    if (contentId) payload.media_content_id = contentId;
    const response = await conn.sendMessagePromise(payload);
    if (isRecord(response) && isRecord(response.result)) return response.result;
    return response ?? null;
  };

  const root = await browseNode();
  if (!isRecord(root)) throw new Error('browse_failed');

  const result: BrowseChoices = { favorites: [], playlists: [], library: [] };
  const visited = new Set<string>();
  const maxExpansions = 18;
  const maxDepth = 4;
  let expansions = 0;

  const addPlayable = (node: BrowseNode, bucket: ChoiceBucket, sourceHint: string) => {
    if (node.can_play !== true) return;
    const fallbackType = bucket === 'playlists' ? 'playlist' : 'music';
    const normalized = normalizeChoices(
      [{ ...node, source: text(node.source) || sourceHint }],
      fallbackType
    );
    result[bucket].push(...normalized);
  };

  let frontier: FrontierEntry[] = children(root)
    .filter(isMusicContent)
    .map((node) => ({ node, bucket: resolveBucket(node), sourceHint: text(root.title) }));

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
    if (isCancelled()) return result;
    const next: FrontierEntry[] = [];
    const expandable: FrontierEntry[] = [];

    frontier.forEach(({ node, bucket: inherited, sourceHint }) => {
      if (!isMusicContent(node)) return;
      const bucket = resolveBucket(node, inherited);
      const nextHint = text(node.title) || sourceHint;
      addPlayable(node, bucket, sourceHint);
      const embedded = children(node);
      embedded.forEach((child) => {
        if (!isMusicContent(child)) return;
        next.push({ node: child, bucket: resolveBucket(child, bucket), sourceHint: nextHint });
      });
      const nodeId = text(node.media_content_id) || text(node.id) || text(node.uri);
      const visitKey = `${text(node.media_content_type) || text(node.media_class)}::${nodeId}`;
      if (
        embedded.length === 0 &&
        node.can_expand === true &&
        node.can_play !== true &&
        nodeId &&
        !visited.has(visitKey)
      ) {
        visited.add(visitKey);
        expandable.push({ node, bucket, sourceHint: nextHint });
      }
    });

    expandable.sort((a, b) => BUCKET_PRIORITY[a.bucket] - BUCKET_PRIORITY[b.bucket]);
    const branches = expandable.slice(0, Math.max(0, maxExpansions - expansions));
    expansions += branches.length;

    const details = await Promise.all(
      branches.map(async (entry) => {
        try {
          return { ...entry, detail: await browseNode(entry.node) };
        } catch {
          return { ...entry, detail: null };
        }
      })
    );

    details.forEach(({ node, bucket, sourceHint, detail }) => {
      const hint = (isRecord(detail) && text(detail.title)) || text(node.title) || sourceHint;
      children(detail).forEach((child) => {
        if (!isMusicContent(child)) return;
        next.push({ node: child, bucket: resolveBucket(child, bucket), sourceHint: hint });
      });
    });

    frontier = next;
    if (expansions >= maxExpansions && frontier.every(({ node }) => node.can_play !== true)) break;
  }

  return {
    favorites: normalizeChoices(result.favorites, 'music'),
    playlists: normalizeChoices(result.playlists, 'playlist'),
    library: normalizeChoices(result.library, 'music'),
  };
}

/** Filters choices by label or id (search tab). */
export function filterChoices(list: MediaChoice[], query: string): MediaChoice[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return list;
  return list.filter(
    (choice) =>
      choice.label.toLowerCase().includes(needle) || choice.id.toLowerCase().includes(needle)
  );
}
