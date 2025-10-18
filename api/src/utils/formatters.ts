import { Platform } from '../services';

export interface UnifiedItem {
  platform: Platform;
  profile: string | null;
  profileName: string | null;
  videoTitle: string | null;
  date: string | null;
  url: string | null;
  previewUrl: string | null;
  views: number | null;
  likes: number | null;
  shares: number | null;
  comments: number | null;
  musicTitle: string | null;
  musicAuthor: string | null;
  duration: string | null;
  raw: Record<string, any>;
}

/**
 * Универсальный форматтер для любых акторов
 */
export function formatResults(
  platform: Platform,
  items: Record<string, any>[]
): UnifiedItem[] {
  return items.map((item) => {
    const data = normalize(platform, item);
    return { ...data, platform, raw: item };
  });
}

/**
 * Приводим каждую платформу к общей структуре
 */
function normalize(platform: Platform, item: Record<string, any>) {
  return {
    profile: item.ownerUsername || item.channelUsername || item.authorMeta?.nickName || null,
    profileName: item.ownerFullName || item.channelName || item.authorMeta?.name || null,
    date: item.timestamp || item.date || item.createTimeISO || null,
    videoTitle: item.caption || item.title || item.text || null,
    previewUrl: item.displayUrl || item.thumbnailUrl || item.videoMeta?.coverUrl || null,
    url: item.url || item.videoUrl || item.webVideoUrl || null,
    views: parseNumber(item.videoViewCount || item.viewCount || item.playCount),
    likes: parseNumber(item.likesCount || item.likes || item.playCount),
    shares: parseNumber(item.sharesCount || item.shares || item.shareCount),
    comments: parseNumber(item.commentsCount || item.commentCount),
    musicTitle: item.musicInfo?.song_name || item.musicMeta?.musicName || null,
    musicAuthor: item.musicInfo?.artist_name || item.musicMeta?.musicAuthor || null,
    duration: item.videoDuration || parseNumber(item.duration) || item.videoMeta?.duration || null,
  };
}

/**
 * Аккуратное приведение чисел
 */
function parseNumber(value: any): number | null {
  if (value == null) return null;
  const num = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(num) ? num : null;
}

export function formatDate(isoString: string | null): string | null {
  if (isoString == null) return null;

  const date = new Date(isoString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Месяцы начинаются с 0
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
