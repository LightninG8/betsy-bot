import fs from 'fs';
import { stringify } from 'csv-stringify';
import { formatDate } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';
import "dotenv/config";


const sheetService = {
  async createCSVSheet(items) {
    const labels = [
      '№',
      'Соцсеть',
      'Ссылка',
      'Просмотры',
      'Лайки',
      'Репосты',
      'Комментарии',
      'Длительность',
      'Музыка',
      'Автор',
      'Имя автора',
      'Описание',
      'Дата публикации',
      'Превью',
    ];

    const values = [
      labels,
      ...items
        .sort(
          (a, b) => (b.views ?? 0) - (a.views ?? 0)
        )
        .map((el, i) => [
          i + 1,
          el.platform,
          el.url,
          el.views,
          el.likes,
          el.shares,
          el.comments,
          el.duration,
          el.musicTitle ? el.musicTitle + ' - ' + el.musicTitle : '',
          el.profile,
          el.profileName,
          el.videoTitle,
          formatDate(el.date),
          el.previewUrl,
        ]),
    ];

    return new Promise((resolve, reject) => {
      stringify(values, { delimiter: ',' }, (err, output) => {
        if (err) {
          logger.error('Ошибка при создании CSV:', err);
          return reject(err);
        }

        const fileName = `Результаты.csv`;
        const dirPath = `./public/${new Date().getTime()}`;
        const outputPath = `${dirPath}/${fileName}`;

        try {
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }

          fs.writeFileSync(outputPath, output, 'utf8');
          logger.info(`CSV-файл успешно создан: ${outputPath}`);

          const sheetUrl = `${process.env.NODE_ENV == "production" ? process.env.SERVER_URL : `http://localhost:${process.env.PORT}`}/${outputPath.replace(
            './',
            ''
          )}`;
          resolve(sheetUrl);
        } catch (e) {
          logger.error(e);
          reject(new Error('Ошибка создания таблицы'));
        }
      });
    });
  },
};

export default sheetService;
