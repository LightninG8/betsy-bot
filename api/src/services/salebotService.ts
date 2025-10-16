import '../utils/env';

import axios from "axios";

const salebotService = {
  sendParsingSuccessWebhook(clientId: number, sheetUrl: string, count: number) {
    return axios.post(
      `https://chatter.salebot.pro/api/${process.env.SALEBOT_API_KEY}/callback`,
      {
        client_id: clientId,
        sheetUrl,
        message: "parsing_ended",
        count
      }
    );
  },
  sendParsingErrorWebhook(clientId: number) {
    return axios.post(
      `https://chatter.salebot.pro/api/${process.env.SALEBOT_API_KEY}/callback`,
      {
        client_id: clientId,
        message: "parsing_error",
      }
    );
  },

  sendServerErrorWebhook(clientId: number) {
    return axios.post(
      `https://chatter.salebot.pro/api/${process.env.SALEBOT_API_KEY}/callback`,
      {
        client_id: clientId,
        message: "server_error",
      }
    );
  },

  sendSaveDatasetWebhook(clientId: number, dataset: string) {
    return axios.post(
      `https://chatter.salebot.pro/api/${process.env.SALEBOT_API_KEY}/callback`,
      {
        client_id: clientId,
        message: "save_dataset",
        datset: dataset,
      }
    );
  },

  sendNoTokensMessage() {
    return axios.post(
      `https://chatter.salebot.pro/api/${process.env.SALEBOT_API_KEY}/callback`,
      {
        client_id: 815499824,
        message: "no_tokens",
      }
    );
  },

  sendKeysHealtcheckWebhook(clientId: number, allBalance: number, allActiveKeys: number) {
    return axios.post(
      `https://chatter.salebot.pro/api/${process.env.SALEBOT_API_KEY}/callback`,
      {
        client_id: clientId,
        message: "keys_healtcheck",
        allBalance,
        allActiveKeys
      }
    );
  }
};


export default salebotService;
