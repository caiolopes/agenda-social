'use strict';

const BootBot = require('bootbot');
const config = require('config').get("FacebookBot");

const bot = new BootBot({
    accessToken: config.get('access_token'),
    verifyToken: config.get('verify_token'),
    appSecret: config.get('app_secret')
});


bot.setGetStartedButton((payload, chat) => {
    chat.sendGenericTemplate(
        [{
            "title": "Olá, sou Contribot, seu assistente por aqui!",
            "item_url": "https://www.facebook.com/Colabore-239391396508366/",
            "image_url": "https://images8.alphacoders.com/672/672712.jpg",
            "subtitle": "Para interagir comigo clique no ícone do menu",
            "buttons": [{
                    "type": "postback",
                    "title": "📖 Lista de ONG's",
                    "payload": "MENU_LIST"
                },
                {
                    "type": "postback",
                    "title": "💬 Encontrar evento",
                    "payload": "MENU_FIND"
                }
            ]
        }]
    );
});

bot.setPersistentMenu([{
        "type": "postback",
        "title": "📖 Lista de ONG's",
        "payload": "MENU_LIST"
    },
    {
        "type": "postback",
        "title": "💬 Encontrar evento",
        "payload": "MENU_FIND"
    },
    {
        "type": "postback",
        "title": "⚙ Configurações",
        "payload": "MENU_SETTINGS"
    }
]);


bot.on('attachment', (payload, chat) => {
    console.log('APLICANDO');

});


bot.hear(['Olá', 'Oi', /eai( there)?/i], (payload, chat) => {
    console.log('Aplicando!');

    chat.getUserProfile().then((user) => {
        chat.say({
            text: `Olá ${user.first_name}, gostaria de saber o que esta rolando na sua região?`,
            quickReplies: [
                { content_type: 'text', title: 'Sim', payload: 'INICIO_SIM' },
                { content_type: 'text', title: 'Não', payload: 'INICIO_NAO' }
            ]
        }, { typing: true });
    });
});

bot.on('quick_reply:INICIO_SIM', (payload, chat) => {
    chat.getUserProfile().then((user) => {
        chat.say({
            text: 'Qual tipo de evento?',
            quickReplies: [
                { content_type: 'text', title: 'ONG\'s', payload: 'TIPO_ONG' },
                { content_type: 'text', title: 'Entreterimento', payload: 'TIPO_EVENTOS' }
            ]
        }, { typing: true });
    });
});


bot.start(8080);