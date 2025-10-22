import "dotenv/config";
import mongoose from 'mongoose';
import axios from 'axios';
import moment from 'moment';
import { logger } from '../utils/index.js';

mongoose.connect(process.env.MONGO_URI || '');

const KeySchema = new mongoose.Schema({
  token: String,
  status: Boolean,
  banned: Boolean,
  balance: Number,
  monthlyUsageCycle: {
    startAt: Date,
    endAt: Date,
  },
});

const Key = mongoose.model('Key', KeySchema);

const databaseService = {
  async checkAndSelectKey() {
    let keys = await Key.find({ status: true, banned: false });
    keys = keys.sort(() => Math.random() - 0.5); // Перемешиваем ключи случайно

    for (const key of keys) {
      try {
        const now = moment();

        const keyStartAt = key.monthlyUsageCycle?.startAt;
        const keyEndAt = key.monthlyUsageCycle?.endAt;

        if (
          now.isBetween(moment(keyStartAt), moment(keyEndAt)) &&
          key.status === false
        ) {
          continue;
        }

        const response = await axios.get(
          'https://api.apify.com/v2/users/me/limits',
          {
            headers: { Authorization: `Bearer ${key.token}` },
          }
        );

        const { data } = response.data;
        const { monthlyUsageUsd } = data.current;
        const { maxMonthlyUsageUsd } = data.limits;
        const { startAt, endAt } = data.monthlyUsageCycle;

        if (monthlyUsageUsd > maxMonthlyUsageUsd - 0.5) {
          await Key.updateOne(
            { _id: key._id },
            { status: false, monthlyUsageCycle: { startAt, endAt } }
          );
          continue;
        } else {
          logger.info(
            `Выбран ключ: ${key.token}, остаток баланса: ${
              maxMonthlyUsageUsd - monthlyUsageUsd
            }`
          );

          await Key.updateOne(
            { _id: key._id },
            { status: true, monthlyUsageCycle: { startAt, endAt } }
          );

          return key.token;
        }
      } catch (error) {
        logger.error(`Ошибка при проверке ключа: ${key.token}`, error);
        await Key.updateOne({ _id: key._id }, { banned: true });
      }
    }

    logger.error('❌ Нет доступных API-ключей');
    return null;
  },

  async updateBalance(token) {
    const response = await axios.get(
      'https://api.apify.com/v2/users/me/limits',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const { data } = response.data;
    const { monthlyUsageUsd } = data.current;
    const { maxMonthlyUsageUsd } = data.limits;

    await Key.updateOne(
      { token },
      { balance: maxMonthlyUsageUsd - monthlyUsageUsd }
    );
  },

  async changeStatus(token, status) {
    await Key.updateOne({ token }, { status });
  },

  async keysHealthcheck() {
    const keys = await Key.find({ banned: false });
    let allBalance = 0;
    let allActiveKeys = 0;

    for (const key of keys) {
      try {
        const response = await axios.get(
          'https://api.apify.com/v2/users/me/limits',
          {
            headers: { Authorization: `Bearer ${key.token}` },
          }
        );

        const { data } = response.data;
        const { monthlyUsageUsd } = data.current;
        const { maxMonthlyUsageUsd } = data.limits;
        const { startAt, endAt } = data.monthlyUsageCycle;

        const balance = Math.max(0, maxMonthlyUsageUsd - monthlyUsageUsd);
        const status = balance > 0.5;
        const banned = false;

        allBalance += balance;
        if (status) allActiveKeys++;

        await Key.updateOne(
          { _id: key._id },
          { monthlyUsageCycle: { startAt, endAt }, banned, status, balance }
        );

        logger.log(`Ключ ${key.token} обновлён. Баланс ${balance}`);
      } catch (error) {
        logger.error(`Ошибка при проверке ключа: ${key.token}`, error);
        await Key.updateOne({ _id: key._id }, { banned: true });
      }
    }

    logger.log(`Активно ${allActiveKeys} ключей. Общий баланс ${allBalance}`);

    return {
      allBalance,
      allActiveKeys,
    };
  },
};

export default databaseService;
