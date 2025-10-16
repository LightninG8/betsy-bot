import '../utils/env';

import mongoose from 'mongoose';
import axios from 'axios';
import moment from 'moment';
import { ENV, logger } from '../utils';

mongoose.connect(ENV.MONGO_URI || '');

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
    let Keys = await Key.find({ status: true, banned: false });
    Keys = Keys.sort(() => Math.random() - 0.5); // Перемешивание ключей в случайном порядке

    for (const Key of Keys) {
      try {
        const now = moment();

        const keyStartAt = Key.monthlyUsageCycle?.startAt;
        const keyEndAt = Key.monthlyUsageCycle?.endAt;

        if (
          now.isBetween(moment(keyStartAt), moment(keyEndAt)) &&
          Key.status == false
        ) {
          continue;
        }

        const response = await axios.get(
          'https://api.apify.com/v2/users/me/limits',
          {
            headers: { Authorization: `Bearer ${Key.token}` },
          }
        );

        const { data } = response.data;
        const { monthlyUsageUsd } = data.current;
        const { maxMonthlyUsageUsd } = data.limits;
        const { startAt, endAt } = data.monthlyUsageCycle;

        if (monthlyUsageUsd > maxMonthlyUsageUsd - 0.5) {
          await Key.updateOne(
            { _id: Key._id },
            { status: false, monthlyUsageCycle: { startAt, endAt } }
          );
          continue;
        } else {
          logger.info(
            `Выбран ключ: ${Key.token}, остаток баланса: ${
              maxMonthlyUsageUsd - monthlyUsageUsd
            }`
          );
          await Key.updateOne(
            { _id: Key._id },
            { status: true, monthlyUsageCycle: { startAt, endAt } }
          );

          return Key.token;
        }
      } catch (error) {
        logger.error(`Ошибка при проверке ключа: ${Key.token}`, error);
        await Key.updateOne({ _id: Key._id }, { banned: true });
      }
    }
    logger.error('Нет доступных API-ключей');
    return null;
  },
  async updateBalance(token: string) {
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
  async changeStatus(token: string, status: boolean) {
    await Key.updateOne({ token }, { status });
  },
  async keysHealthcheck() {
    const Keys = await Key.find({ banned: false });
    let allBalance = 0;
    let allActiveKeys = 0;

    for (const Key of Keys) {
      try {
        const response = await axios.get(
          'https://api.apify.com/v2/users/me/limits',
          {
            headers: { Authorization: `Bearer ${Key.token}` },
          }
        );

        const { data } = response.data;
        const { monthlyUsageUsd } = data.current;
        const { maxMonthlyUsageUsd } = data.limits;
        const { startAt, endAt } = data.monthlyUsageCycle;

        const banned = false;
        const balance = Math.max(0, maxMonthlyUsageUsd - monthlyUsageUsd);
        const status = balance > 0.5;

        allBalance += balance;
        allActiveKeys += status ? 1 : 0;

        await Key.updateOne(
          { _id: Key._id },
          { monthlyUsageCycle: { startAt, endAt }, banned, status, balance }
        );

        logger.log(`Ключ ${Key.token} обновлен. Баланс ${balance}}`);
      } catch (error) {
        logger.error(`Ошибка при проверке ключа: ${Key.token}`, error);
        await Key.updateOne({ _id: Key._id }, { banned: true });
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
