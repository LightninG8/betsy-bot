import { ApifyClient } from 'apify-client';
import express from 'express';
import 'dotenv/config';
import bodyParser from 'body-parser';
import log4js from 'log4js';
import salebotService from './salebotService.js';
import logger from './logger.js';
import databaseService from './databaseService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 80;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, './public')));
app.use(log4js.connectLogger(logger, { level: 'info' }));

// eslint-disable-next-line max-lines-per-function
app.post('/parse', (req, res) => {
  try {
    const username = req.body['username'];
    const resultsLimit = +req.body['resultsLimit'] || 200;
    const clientId = +req.body['clientId'] || 811546739;

    const actorInput = {
      username: [username],
      resultsLimit: resultsLimit,
    };

    function parse() {
      databaseService
        .checkAndSelectApiKey()
        .then(async (token) => {
          if (!token) {
            salebotService.sendNoTokensMessage();

            throw new Error('Отсутствуют доступные Apify ключи');
          }

          const client = new ApifyClient({
            token,
          });

          logger.info(
            `Старт парсинга REELS аккаунта @${username} для ${clientId}`
          );

          try {
            const run = await client
              .actor('apify/instagram-reel-scraper')
              .call(actorInput);
            const dataset = `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`;

            logger.info(
              `💾 Датасет @${username} для ${clientId}: ${dataset}`
            );

            databaseService.updateBalance(token);
            salebotService.sendSaveDatasetWebhook(clientId, dataset);
            const dataset_2 = await client.dataset(run.defaultDatasetId).listItems();
            const { items } = dataset_2;
            const sheetUrl = await googleService
              .createCSVSheet(username, items);
            salebotService.sendParsingSuccessWebhook(
              clientId,
              sheetUrl,
              dataset_2.count
            ); logger.log(
              `Окончен парсинг REELS аккаунта @${username} для ${clientId}`
            );
          } catch (e) {
            logger.error(`Ошибка ключа ${token}`, e);
            databaseService.changeStatus(token, false);
            parse();
          }
        })
        .catch((e) => {
          logger.error(
            `Ошибка парсинга REELS аккаунта @${username} для ${clientId}`,
            e
          );
          salebotService.sendParsingErrorWebhook(clientId);
        });
    }

    parse();

    res.sendStatus(200);
  } catch (e) {
    const clientId = +req.body['clientId'];

    salebotService.sendServerErrorWebhook(clientId);

    res.sendStatus(401);
  }
});

app.post('/healthcheck', async (req, res) => {
  try {
    // const clientId = +req.body['clientId'] || 811546739;

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

app.listen(port, () => {
  logger.info(`Приложение запущено на порту ${port}`);
});
