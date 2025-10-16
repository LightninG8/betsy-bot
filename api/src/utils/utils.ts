import express from 'express';

// --- Регулярки для каждой платформы ---
const REGEX = {
  instagram: /instagram\.com\/(?:reel|reels)\//i,
  youtube: /youtube\.com\/shorts\//i,
  tiktok: /tiktok\.com\//i,
};

// --- Проверка одной ссылки ---
export function isValidInstagramLink(link: string): boolean {
  return REGEX.instagram.test(link);
}
export function isValidYouTubeLink(link: string): boolean {
  return REGEX.youtube.test(link);
}
export function isValidTikTokLink(link: string): boolean {
  return REGEX.tiktok.test(link);
}

export function isValidLink(link: string): boolean {
  return (
    isValidInstagramLink(link) ||
    isValidYouTubeLink(link) ||
    isValidTikTokLink(link)
  );
}

// --- Middleware для валидации links ---
export function validateLinks(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const { links } = req.body;

  if (!Array.isArray(links) || links.length === 0) {
    return res.status(400).json({
      error: true,
      message: '`links` должен быть непустым массивом строк.',
    });
  }

  const invalid = links.filter(
    (link) => typeof link !== 'string' || !isValidLink(link)
  );

  if (invalid.length > 0) {
    return res.status(400).json({
      error: true,
      message: 'Некоторые ссылки недействительны.',
      invalidLinks: invalid,
    });
  }

  return next();
}
