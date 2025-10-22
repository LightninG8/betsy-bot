import log4js from "log4js";

log4js.configure({
    appenders: {
        console: {type: 'console'},
        file: {
            type: 'multiFile', base: 'logs/', property: 'categoryName', extension: '.log', maxLogSize: 1024*5, backup: 5
        }
    },
    categories: {
        default: {
            appenders: ['console', 'file'], 
            level: 'trace',
        },
    }
});

export const logger = log4js.getLogger('app');
