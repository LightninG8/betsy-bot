import axios from 'axios';
import 'dotenv';

const salebotService = {
  sendParsingSuccessWebhook(clientId, sheetUrl, count) {
    return axios.post(
      `https://chatter.salebot.pro/api/${process.env.SALEBOT_API_KEY}/callback`,
      {
        client_id: clientId,
        message: 'parsing_ended',
        sheetUrl: sheetUrl,
        count
      }
    );
  },
  sendParsingErrorWebhook(clientId) {
    return axios.post(
      `https://chatter.salebot.pro/api/${process.env.SALEBOT_API_KEY}/callback`,
      {
        client_id: clientId,
        message: 'parsing_error',
      }
    );
  },

  sendServerErrorWebhook(clientId) {
    return axios.post(
      `https://chatter.salebot.pro/api/${process.env.SALEBOT_API_KEY}/callback`,
      {
        client_id: clientId,
        message: 'server_error',
      }
    );
  },

  sendSaveDatasetWebhook(clientId, dataset) {
    return axios.post(
      `https://chatter.salebot.pro/api/${process.env.SALEBOT_API_KEY}/callback`,
      {
        client_id: clientId,
        message: 'save_dataset',
        datset: dataset,
      }
    );
  },

  sendNoTokensMessage() {
    return axios.post(
      `https://chatter.salebot.pro/api/${process.env.SALEBOT_API_KEY}/callback`,
      {
        client_id: 811546739,
        message: 'no_tokens',
      }
    );
  },

  sendKeysHealtcheckWebhook(clientId, allBalance, allActiveKeys) {
    return axios.post(
      `https://chatter.salebot.pro/api/${process.env.SALEBOT_API_KEY}/callback`,
      {
        client_id: clientId,
        message: 'keys_healtcheck',
        allBalance,
        allActiveKeys
      }
    );
  }
};


export default salebotService;
