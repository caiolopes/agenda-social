'use strict';

const BootBot = require('bootbot');
const config = require('config').get("FacebookBot");
const async = require('async');
const fetch = require('node-fetch');
var {FB, FacebookApiException} = require('fb');

const bot = new BootBot({
    accessToken: config.get('access_token'),
    verifyToken: config.get('verify_token'),
    appSecret: config.get('app_secret')
});

// https://www.facebook.com/CadiBrasil/
// https://www.facebook.com/projetoabraco
// https://www.facebook.com/ONGArtsol/

const ONGs = ['CadiBrasil', 'amamoscasadeacolhimento', 'projetoabraco', 'ONGArtsol'];

function getLocation(place) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${place}`;
    return fetch(url)
        .then(res => res.json())
        .catch(err => console.log(`Error getting user profile: ${err}`));
}

FB.setAccessToken(config.get('access_token'));

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
                    "payload": "MENU_FIND"
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
        "payload": "MENU_FIND"
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

bot.on('postback:MENU_FIND', (payload, chat) => {
    chat.conversation((convo) => {
        convo.ask(`Digite sua localização:`, findLocation);
    });
});


const findLocation = (payload, convo) => {
    const text = payload.message.text;
    getLocation(encodeURIComponent(text)).then((res) => {
        console.log(res);
        var adress = res.results[0].formatted_address;
        console.log(adress);
        convo.say({
            text: 'Sua localização é ' + adress + '?',
            quickReplies: [
                { content_type: 'text', title: 'Sim', payload: 'ADRESS_SIM' },
                { content_type: 'text', title: 'Não', payload: 'ADRESS_NAO' }
            ]
        }, { typing: true });
    });
};

bot.on('attachment', (payload, chat) => {});

bot.hear(['Olá', 'Oi', /eai( there)?/i], (payload, chat) => {
    console.log('Aplicando!');

    chat.getUserProfile().then((user) => {
        chat.say({
            text: `Olá ${user.first_name}, você gostaria de colaborar e fazer a diferença no mundo?`,
            quickReplies: [
                { content_type: 'text', title: 'Sim', payload: 'INICIO_SIM' },
                { content_type: 'text', title: 'Não', payload: 'INICIO_NAO' },
            ]
        }, { typing: true });
    });
});

bot.on('quick_reply:INICIO_SIM', (payload, chat) => {
    console.log('INICIO_SIM');
    chat.getUserProfile().then((user) => {
        chat.say({
            text: 'Que legal! Você deseja ver uma lista de ONGs ou eventos próximos a você?',
            quickReplies: [
                { content_type: 'text', title: 'ONGs', payload: 'TIPO_ONG' },
                { content_type: 'text', title: 'Eventos', payload: 'TIPO_EVENTOS' }
            ]
        }, { typing: true });
    });
});

bot.on('postback:ONG_EVENT', (payload, chat) => {
  console.log(JSON.stringify(payload, undefined, 2));
  const args = payload.postback.split(':')[1];
  
});

bot.on('quick_reply:ADRESS_SIM', (payload, chat) => {
  const userId = payload.sender.id;
  const requests = ONGs.map((ong) => {
    return function(callback) { 
      FB.api(
        `/${ong}/picture`,
        'GET',
        {"type":"large", redirect: false},
        function(response) {
          callback(null, response.data.url);
        }
      );
    }
  });
  async.parallel(requests, function(err, results) {
    const elements = [];
    results.forEach((image_url, i) => {
      elements.push({
        title: ONGs[i],
        image_url,
        buttons:[{
            type:"postback",
            title: `Eventos`,
            payload:"ONG_EVENT:"+ONGs[i]
        }]
      });
    });
    chat.sendGenericTemplate(elements, { typing: true });
  });
});

bot.start(8080);