import './utils/env';

import bodyParser from 'body-parser';
import express from 'express';
import * as path from 'path';
import log4js from 'log4js';
import { formatResults, logger, validateLinks } from './utils';
import databaseService from './services/databaseService';
import { apifyService, Platform } from './services';
import sheetService from './services/sheetService';
import salebotService from './services/salebotService';
import fs from 'fs';

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(log4js.connectLogger(logger, { level: 'info' }));

const publicPath = path.join(__dirname, 'public');

// ✅ Проверяем — если нет папки, создаём
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
  console.log(`📁 Папка 'public' создана по пути: ${publicPath}`);
}

// Подключаем как static
app.use('/public', express.static(publicPath));

app.post('/parse', validateLinks, (req, res) => {
  try {
    const links = req.body['links'];
    const clientId = req.body['clientId'];

    if (!Array.isArray(links) || links.length === 0) {
      return res
        .status(400)
        .json({ message: "Поле 'links' должно быть непустым массивом." });
    }

    if (!clientId) {
      return res.status(400).json({ message: "Отсутствует 'clientId'." });
    }

    // Разделяем ссылки по платформам
    const grouped = apifyService.splitLinksByPlatform(links);

    // Собираем задачи
    const tasks = Object.keys(grouped)
      .filter((p) => grouped[p].length > 0)
      .map((p) =>
        apifyService.processPlatform({
          platform: p as Platform,
          links: grouped[p],
          clientId,
        })
      );

    if (tasks.length === 0) {
      return res.status(400).json({ message: 'Нет корректных ссылок.' });
    }

    const flow = async () => {
      // Выполняем все акторы параллельно, не падаем при ошибке одного
      const results = await Promise.allSettled(tasks);

      const fulfilled = results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value);

      const rejected = results
        .filter((r) => r.status === 'rejected')
        .map((r) => ({
          error:
            r.reason instanceof Error ? r.reason.message : String(r.reason),
        }));

      // Логируем
      if (fulfilled.length > 0)
        logger.info(
          `✅ Успешно завершены акторы: ${fulfilled.length} для ${clientId}`
        );
      if (rejected.length > 0)
        logger.error(`❌ Ошибок при выполнении акторов: ${rejected.length}`);

      const formattedResults = fulfilled.flatMap((result) =>
        formatResults(result.platform, result.items)
      );

      const sheetUrl = (await sheetService.createCSVSheet(
        formattedResults
      )) as string;

      await salebotService.sendParsingSuccessWebhook(
        clientId,
        sheetUrl,
        formattedResults.length
      );
    };

    flow();

    // Возвращаем ответ
    return res.sendStatus(200);
  } catch (err) {
    // Глобальная ошибка, если что-то пошло не так
    logger.error(`🚨 Ошибка при обработке /parse`, err);

    return res.status(500).json({
      message: 'Внутренняя ошибка сервера во время парсинга.',
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

app.post('/healthcheck', async (req, res) => {
  try {
    const { allBalance, allActiveKeys } =
      await databaseService.keysHealthcheck();

    res.send({
      allBalance,
      allActiveKeys,
    });
  } catch (e) {
    logger.error('Ошибка проверки ключей ', e);

    res.sendStatus(401);
  }
});

const port = process.env.PORT || 3003;

app.listen(port, () => {
  logger.log(`🚀 Приложение запущено at http://localhost:${port}/`);
});
// server.on('error', logger.error);
