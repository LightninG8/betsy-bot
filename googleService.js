import fs from 'fs';
import logger from './logger.js';
import 'dotenv/config';
import { stringify } from 'csv-stringify';

const googleService = {
    // eslint-disable-next-line max-lines-per-function
    async createCSVSheet(username, items) {
        const labels = ['№', 'Ссылка', 'Дата публикации', 'Просмотры', 'Лайки', 'Комментарии', 'Длительность', 'Музыка', 'Описание'];

        const values = [
            labels,
            ...items
                .sort((a, b) => b.videoPlayCount - a.videoPlayCount)
                .map((el, i) => [
                    i + 1,
                    el.url,
                    formatDate(el.timestamp),
                    el.videoPlayCount,
                    el.likesCount,
                    el.commentsCount,
                    el.videoDuration,
                    el.musicInfo?.artist_name + ' - ' + el.musicInfo?.song_name,
                    el.caption,
                ]),
        ];

        return new Promise((resolve, reject) => {
            stringify(values, { delimiter: ',' }, (err, output) => {
                if (err) {
                    logger.error('Ошибка при создании CSV:', err);
                    return reject(err);
                }

                const fileName = 'Результаты.csv';
                const dirPath = `./public/${new Date().getTime()}`;
                const outputPath = `${dirPath}/${fileName}`;

                try {
                    if (!fs.existsSync(dirPath)) {
                        fs.mkdirSync(dirPath, { recursive: true });
                    }

                    fs.writeFileSync(outputPath, output, 'utf8');
                    logger.info(`CSV-файл успешно создан: ${outputPath}`);

                    const sheetUrl = `${process.env.SERVER_URL}/${outputPath.replace('./public/', '')}`;
                    resolve(sheetUrl);
                } catch (e) {
                    logger.error(e);
                    reject(new Error('Ошибка создания таблицы'));
                }
            });
        });
    },
};

function formatDate(isoString) {
    const date = new Date(isoString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export default googleService;
