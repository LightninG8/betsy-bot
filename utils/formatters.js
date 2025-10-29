
/**
 * Универсальный форматтер для любых акторов
 */
export function formatResults(platform, items) {
  return items.map((item) => {
    const data = normalize(platform, item);
    return { ...data, platform };
  });
}

/**
 * Приводим каждую платформу к общей структуре
 */
function normalize(platform, item) {
  return {
    profile:
      item.ownerUsername ||
      item.channelUsername ||
      item.authorMeta?.nickName ||
      null,
    profileName:
      item.ownerFullName ||
      item.channelName ||
      item.authorMeta?.name ||
      null,
    date: item.timestamp || item.date || item.createTimeISO || null,
    videoTitle: item.caption || item.title || item.text || null,
    previewUrl:
      item.displayUrl ||
      item.thumbnailUrl ||
      item.videoMeta?.coverUrl ||
      null,
    url: item.url || item.videoUrl || item.webVideoUrl || null,
    views: parseNumber(
      item.videoPlayCount || item.viewCount || item.playCount
    ),
    likes: parseNumber(item.likesCount || item.likes || item.diggCount),
    shares: parseNumber(item.sharesCount || item.shares || item.shareCount),
    comments: parseNumber(item.commentsCount || item.commentCount),
    musicTitle:
      item.musicInfo?.song_name || item.musicMeta?.musicName || null,
    musicAuthor:
      item.musicInfo?.artist_name || item.musicMeta?.musicAuthor || null,
    duration:
      item.videoDuration ||
      parseNumber(item.duration) ||
      item.videoMeta?.duration ||
      null,
  };
}

/**
 * Аккуратное приведение чисел
 */
function parseNumber(value) {
  if (value == null) return null;
  const num = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(num) ? num : null;
}

/**
 * Форматирование даты в "dd.mm.yyyy hh:mm"
 */
export function formatDate(isoString) {
  if (isoString == null) return null;

  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}



export function sortResultsByInputOrder(inputLinks, results) {
  // Создаём карту: ключ = "чистая ссылка" (без query-параметров)
  const linkOrder = new Map();
  inputLinks.forEach((link, index) => {
    // Удаляем query-параметры для надёжного сравнения
    const clean = link.split('?')[0];
    linkOrder.set(clean, index);
  });

  // Сортируем результаты в том же порядке
  return results.sort((a, b) => {
    const linkA = a.url.split('?')[0];
    const linkB = b.url.split('?')[0];

    const orderA = linkOrder.get(linkA) ?? Number.MAX_SAFE_INTEGER;
    const orderB = linkOrder.get(linkB) ?? Number.MAX_SAFE_INTEGER;

    return orderA - orderB;
  });
}
