import { ApifyClient } from 'apify-client';
import {
  isValidInstagramLink,
  isValidTikTokLink,
  isValidYouTubeLink,
  logger,
} from '../utils';
import databaseService from './databaseService';

// === Конфигурация для каждой платформы ===
const platforms = {
  instagram: {
    actor: 'apify/instagram-reel-scraper',
    label: 'Instagram',
    configureInput: (links: string[]) => ({
      includeSharesCount: true,
      resultsLimit: 10000,
      username: links,
    }),
  },
  youtube: {
    actor: 'streamers/youtube-shorts-scraper',
    label: 'YouTube',
    configureInput: (links: string[]) => ({
      maxResultsShorts: 1000,
      channels: links,
    }),
  },
  tiktok: {
    actor: 'clockworks/tiktok-video-scraper',
    label: 'TikTok',
    configureInput: (links: string[]) => ({
      postURLs: links,
      resultsPerPage: 100,
      scrapeRelatedVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadSubtitles: false,
      shouldDownloadVideos: false,
    }),
  },
} as const;

// === Тип платформы автоматически формируется по ключам объекта ===
export type Platform = keyof typeof platforms;

// Создаём клиента Apify
export const apifyService = {
  // === Универсальная асинхронная функция обработки одной платформы ===
  async processPlatform({
    platform,
    links,
    clientId,
    retry = false,
  }: {
    platform: Platform;
    links: string[];
    clientId: number;
    retry?: boolean;
  }): Promise<{ platform: Platform; items: object[] }> {
    const { actor, label, configureInput } = platforms[platform];

    const task = async () => {
      // 1️⃣ Получаем ключ Apify
      const token = await databaseService.checkAndSelectKey();
      if (!token) {
        // salebotService.sendNoTokensMessage();
        throw new Error('Отсутствуют доступные Apify ключи');
      }

      // 2️⃣ Создаём клиент
      const client = new ApifyClient({ token });
      const actorInput = configureInput(links);

      try {
        // 3️⃣ Запускаем actor
        const run = await client.actor(actor).call(actorInput);
        logger.info(
          `🚀 Запуск парсинга ${label} (${links.length} ссылок) для ${clientId}`
        );

        const datasetUrl = `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`;
        logger.info(
          `💾 Датасет ${label} (${links.length} ссылок) для ${clientId} готов: ${datasetUrl}`
        );

        // 4️⃣ Обновляем баланс
        databaseService.updateBalance(token);

        // 5️⃣ Получаем результаты
        const dataset = await client.dataset(run.defaultDatasetId).listItems();
        const items: object[] = dataset.items;

        logger.log(
          `✅ Окончен парсинг ${label} (${links.length} ссылок) для ${clientId} для ${clientId}`
        );

        return { platform, items };
      } catch (error) {
        let message = 'Неизвестная ошибка';

        if (error instanceof Error) {
          message = error.message;
        } else if (typeof error === 'string') {
          message = error;
        } else if (typeof error === 'object' && error !== null) {
          message = JSON.stringify(error);
        }

        logger.error(`❌ Ошибка ${label}`, message);

        // 🚨 если токен невалиден
        if (
          message.includes('authentication token is not valid') ||
          message.includes('User was not found')
        ) {
          logger.warn(
            `🔁 Токен ${token} невалиден — обновляем статус и пробуем заново`
          );
          await databaseService.changeStatus(token, false);

          if (!retry) {
            return this.processPlatform({
              platform,
              links,
              clientId,
              retry: true,
            });
          } else {
            logger.error(`❌ Повторная попытка для ${label} тоже не удалась`);
          }
        }

        // 💥 Пробрасываем ошибку дальше
        throw new Error(`Ошибка ${label}: ${message}`);
      }
    };

    return task();
  },

  // === Разделение ссылок по платформам ===
  splitLinksByPlatform(links: string[]) {
    const grouped: Record<string, string[]> = {
      instagram: [],
      youtube: [],
      tiktok: [],
    };

    for (const link of links) {
      if (isValidInstagramLink(link)) grouped.instagram.push(link);
      else if (isValidYouTubeLink(link)) grouped.youtube.push(link);
      else if (isValidTikTokLink(link)) grouped.tiktok.push(link);
    }

    return grouped;
  },
};
