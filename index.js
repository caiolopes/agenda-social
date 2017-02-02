'use strict';

const BootBot = require('bootbot');
const config = require('config').get("FacebookBot");

const bot = new BootBot({
    accessToken: config.get('access_token'),
    verifyToken: config.get('verify_token'),
    appSecret: config.get('app_secret')
});


bot.on('attachment', (payload, chat) => {});


bot.hear(['Olá', 'Oi', /eai( there)?/i], (payload, chat) => {
    console.log('HELLO WORLD!');
    chat.getUserProfile().then((user) => {
        chat.say({
            text: `Olá ${user.first_name}, gostaria de saber o que esta rolando na sua região?`,
            buttons: [
                { type: 'postback', title: 'Sim', payload: 'INICIO_SIM' },
                { type: 'postback', title: 'Não', payload: 'INICIO_NAO' },
                { type: 'postback', title: 'Talvez mais tarde', payload: 'INICIO_TALVEZ' }
            ]
        }, { typing: true });
    });
});

bot.on('postback:INICIO_SIM', (payload, chat) => {
    chat.getUserProfile().then((user) => {
        chat.getUserProfile().then((user) => {
            chat.say({
                text: 'Qual tipo de evento?',
                buttons: [
                    { type: 'postback', title: 'ONG\'s', payload: 'TIPO_ONG' },
                    { type: 'postback', title: 'Eventos', payload: 'TIPO_EVENTOS' }
                ]
            }, { typing: true });
        });
    });
});


bot.start(8080);