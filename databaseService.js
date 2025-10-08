import mongoose from "mongoose";
import axios from "axios";
import moment from "moment";
import logger from "./logger.js";
import "dotenv/config";

mongoose.connect(process.env.MONGO_URI);

const ApiKeySchema = new mongoose.Schema({
  token: String,
  status: Boolean,
  banned: Boolean,
  balance: Number,
  monthlyUsageCycle: {
    startAt: Date,
    endAt: Date,
  },
});

const ApiKey = mongoose.model("ApiKey", ApiKeySchema);

const databaseService = {
  async checkAndSelectApiKey() {
    let apiKeys = await ApiKey.find({ status: true, banned: false });
    apiKeys = apiKeys.sort(() => Math.random() - 0.5); // Перемешивание ключей в случайном порядке
  
    for (const apiKey of apiKeys) {
      try {
        const now = moment();

        const keyStartAt = apiKey.monthlyUsageCycle.startAt;
        const keyEndAt = apiKey.monthlyUsageCycle.endAt;

        if (
          now.isBetween(moment(keyStartAt), moment(keyEndAt)) &&
          apiKey.status == false
        ) {
          continue;
        }

        const response = await axios.get(
          "https://api.apify.com/v2/users/me/limits",
          {
            headers: { Authorization: `Bearer ${apiKey.token}` },
          }
        );

        const { data } = response.data;
        const { monthlyUsageUsd } = data.current;
        const { maxMonthlyUsageUsd } = data.limits;
        const { startAt, endAt } = data.monthlyUsageCycle;

        if (monthlyUsageUsd > maxMonthlyUsageUsd - 0.5) {
          await ApiKey.updateOne(
            { _id: apiKey._id },
            { status: false, monthlyUsageCycle: { startAt, endAt } }
          );
          continue;
        } else {
          logger.info(
            `Выбран ключ: ${apiKey.token}, остаток баланса: ${
              maxMonthlyUsageUsd - monthlyUsageUsd
            }`
          );
          await ApiKey.updateOne(
            { _id: apiKey._id },
            { status: true, monthlyUsageCycle: { startAt, endAt } }
          );

          return apiKey.token;
        }
      } catch (error) {
        logger.error(`Ошибка при проверке ключа: ${apiKey.token}`, error);
        await ApiKey.updateOne({ _id: apiKey._id }, { banned: true });
      }
    }
    logger.error("Нет доступных API-ключей");
    return null;
  },
  async updateBalance(token) {
    const response = await axios.get(
      "https://api.apify.com/v2/users/me/limits",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const { data } = response.data;
    const { monthlyUsageUsd } = data.current;
    const { maxMonthlyUsageUsd } = data.limits;

    await ApiKey.updateOne(
      { token },
      { balance: maxMonthlyUsageUsd - monthlyUsageUsd}
    );
  },
  async changeStatus(token, status) {
    await ApiKey.updateOne(
      { token },
      { status}
    );
  },
  async keysHealthcheck() {
    const apiKeys = await ApiKey.find({ banned: false });
    let allBalance = 0;
    let allActiveKeys = 0;
    
    for (const apiKey of apiKeys) {
      try {
        const response = await axios.get(
          "https://api.apify.com/v2/users/me/limits",
          {
            headers: { Authorization: `Bearer ${apiKey.token}` },
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
    
        await ApiKey.updateOne(
          { _id: apiKey._id },
          { status: false, monthlyUsageCycle: { startAt, endAt },banned, status, balance }
        );
    
        logger.log(`Ключ ${apiKey.token} обновлен. Баланс ${balance}}`)
      } catch (error) {
        logger.error(`Ошибка при проверке ключа: ${apiKey.token}`, error);
        await ApiKey.updateOne({ _id: apiKey._id }, { banned: true });
      }
    }

    logger.log(`Активно ${allActiveKeys} ключей. Общий баланс ${allBalance}`);

    return {
      allBalance,
      allActiveKeys
    }    
  }
};

export default databaseService;
