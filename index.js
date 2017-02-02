'use strict';

const BootBot = require('bootbot');
const config = require('config').get("FacebookBot");

const bot = new BootBot({
    accessToken: config.get('access_token'),
    verifyToken: config.get('verify_token'),
    appSecret: config.get('app_secret')
});


bot.hear(['Olá', 'Oi', /eai( there)?/i], (payload, chat) => {
    console.log('HELLO WORLD!');
    chat.say({
        text: 'Precisa de ajuda?!',
        buttons: [
            { type: 'postback', title: 'Sim', payload: 'HELP_SETTINGS' },
            { type: 'postback', title: 'Não', payload: 'HELP_FAQ' },
            { type: 'postback', title: 'Talvez mais tarde', payload: 'HELP_HUMAN' }
        ]
    }, { typing: true });
});

bot.start(8080);