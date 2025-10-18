import fs from "fs";
import "dotenv/config";
import { stringify } from "csv-stringify";
import { formatDate, UnifiedItem } from "../utils/formatters.js";
import { logger } from "../utils/logger.js";

const sheetService = {
  async createCSVSheet(items: UnifiedItem[]) {
    const labels = [
      "№",
      "Соцсеть",
      "Ссылка",
      "Просмотры",
      "Лайки",
      "Репосты",
      "Комментарии",
      "Длительность",
      "Музыка",
      "Автор",
      "Имя автора",
      "Описание",
      "Дата публикации",
      "Превью"
    ];

    const values = [
      labels,
      ...items
        .sort((a: UnifiedItem, b: UnifiedItem) => (b.views ?? 0) - (a.views ?? 0))
        .map((el: UnifiedItem, i: number) => [
          i + 1,
          el.platform,
          el.url,
          el.views,
          el.likes,
          el.shares,
          el.comments,
          el.duration,
          el.musicTitle? el.musicTitle + " - " + el.musicTitle : "",
          el.profile,
          el.profileName,
          el.videoTitle,
          formatDate(el.date),
          el.previewUrl
        ]),
    ];

    return new Promise((resolve, reject) => {
      stringify(values, { delimiter: "," }, (err, output) => {
        if (err) {
          logger.error("Ошибка при создании CSV:", err);
          return reject(err);
        }

        const fileName = `Результаты.csv`;
        const dirPath = `./api/src/public/${new Date().getTime()}`;
        const outputPath = `${dirPath}/${fileName}`;

        try {
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }

          fs.writeFileSync(outputPath, output, "utf8");
          logger.info(`CSV-файл успешно создан: ${outputPath}`);

          const sheetUrl = `${process.env.SERVER_URL}/${outputPath.replace("./api/src/", "")}`;
          resolve(sheetUrl);
        } catch (e) {
          logger.error(e);
          reject(new Error("Ошибка создания таблицы"));
        }
      });
    });
  }
};


export default sheetService;
