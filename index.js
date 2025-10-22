// utils/env.js — просто импорт, чтобы загрузить переменные окружения
import 'dotenv/config';

import bodyParser from 'body-parser';
import express from 'express';
import path from 'path';
import log4js from 'log4js';

import { formatResults, logger, validateLinks } from './utils/index.js';
import databaseService from './services/databaseService.js';
import { apifyService, Platform } from './services/index.js';
import sheetService from './services/sheetService.js';
import salebotService from './services/salebotService.js';

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(log4js.connectLogger(logger, { level: 'info' }));

// Раздача статики
app.use('/public', express.static(path.join(path.dirname(import.meta.url.replace('file://', '')), 'public')));

// Основной маршрут парсинга
app.post('/parse', validateLinks, async (req, res) => {
    try {
        let links = req.body['links'];
        const clientId = req.body['clientId'];

        if (typeof links === 'string') {
          links = JSON.parse(links);
        }

        if (!Array.isArray(links) || links.length === 0) {
            return res.status(400).json({ message: "Поле 'links' должно быть непустым массивом.", links });
        }

        if (!clientId) {
            return res.status(400).json({ message: "Отсутствует 'clientId'." });
        }

        // Разделяем ссылки по платформам
        const grouped = apifyService.splitLinksByPlatform(links);

        // Собираем задачи для каждой платформы
        const tasks = Object.keys(grouped)
            .filter((p) => grouped[p].length > 0)
            .map((p) =>
                apifyService.processPlatform({
                    platform: p,
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

            const fulfilled = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);

            const rejected = results
                .filter((r) => r.status === 'rejected')
                .map((r) => ({
                    error: r.reason instanceof Error ? r.reason.message : String(r.reason),
                }));

            // Логируем
            if (fulfilled.length > 0) logger.info(`✅ Успешно завершены акторы: ${fulfilled.length} для ${clientId}`);
            if (rejected.length > 0) logger.error(`❌ Ошибок при выполнении акторов: ${rejected.length}`);

            const formattedResults = fulfilled.flatMap((result) => formatResults(result.platform, result.items));

            const sheetUrl = await sheetService.createCSVSheet(formattedResults);

            await salebotService.sendParsingSuccessWebhook(clientId, sheetUrl, formattedResults.length);

            return sheetUrl;
        };

        flow();

        return res.sendStatus(200);
    } catch (err) {
        logger.error(`🚨 Ошибка при обработке /parse`, err);

        return res.status(500).json({
            message: 'Внутренняя ошибка сервера во время парсинга.',
            error: err instanceof Error ? err.message : String(err),
        });
    }
});

// Проверка состояния API
app.post('/healthcheck', async (req, res) => {
    try {
        const { allBalance, allActiveKeys } = await databaseService.keysHealthcheck();

        res.send({
            allBalance,
            allActiveKeys,
        });
    } catch (e) {
        logger.error('Ошибка проверки ключей ', e);
        res.sendStatus(401);
    }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    logger.info(`🚀 Приложение запущено at http://localhost:${port}/`);
});
