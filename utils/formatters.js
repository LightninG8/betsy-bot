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
    console.log(item);
    return {
        profile: item.ownerUsername || item.channelUsername || item.authorMeta?.nickName || null,
        profileName: item.ownerFullName || item.channelName || item.authorMeta?.name || null,
        date: item.timestamp || item.date || item.createTimeISO || null,
        videoTitle: item.caption || item.title || item.text || null,
        previewUrl: item.displayUrl || item.thumbnailUrl || item.videoMeta?.coverUrl || null,
        url: item.url || item.videoUrl || item.submittedVideoUrl || null,
        views: parseNumber(item.videoPlayCount || item.viewCount || item.playCount),
        likes: parseNumber(item.likesCount || item.likes || item.diggCount),
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

export function sortResultsByInputOrder(links, results) {
    const normalizeUrl = (url) => {
        if (!url) return '';
        try {
            // убираем экранирование
            url = url.replace(/\\\//g, '/');
            const u = new URL(url);
            let host = u.host.replace(/^www\./, '');
            let path = u.pathname.replace(/\/+$/, ''); // без завершающих слешей

            // --- Instagram ---
            // Приводим все reel/p к единому формату: instagram.com/reel/{id}
            if (host.includes('instagram.com')) {
                const match = path.match(/\/(?:reel|p)\/([^/]+)/);
                if (match) return `instagram.com/reel/${match[1]}`;
            }

            // --- TikTok ---
            // Короткие ссылки vt.tiktok.com/... → tiktok.com/vt/{id}
            if (host.includes('tiktok.com')) {
                // короткие
                const vt = path.match(/\/Z[A-Za-z0-9]+/);
                if (host.startsWith('vt.')) return `tiktok.com/vt${vt ? vt[0] : path}`;

                // обычные
                const video = path.match(/\/video\/(\d+)/);
                if (video) return `tiktok.com/video/${video[1]}`;
            }

            // --- YouTube Shorts ---
            if (host.includes('youtube.com')) {
                const short = path.match(/\/shorts\/([A-Za-z0-9_-]+)/);
                if (short) return `youtube.com/shorts/${short[1]}`;
            }

            // дефолт — без query/hash
            return `${host}${path}`;
        } catch {
            return url;
        }
    };

    const orderMap = new Map(links.map((url, i) => [normalizeUrl(url), i]));

    return results.sort((a, b) => {
        const indexA = orderMap.get(normalizeUrl(a.url)) ?? Infinity;
        const indexB = orderMap.get(normalizeUrl(b.url)) ?? Infinity;
        return indexA - indexB;
    });
}
