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

let USERS = [];

String.prototype.trunc = function (n) {
  return this.substr(0, n - 1) + (this.length > n ? '...' : '');
};

function getLocation(place) {
  const url = encodeURI(`https://maps.googleapis.com/maps/api/geocode/json?address=${place}`);
  return fetch(url)
    .then(res => res.json())
    .catch(err => console.log(`Error getting user profile: ${err}`));
}

function getDistance(userId, lat, lon) {
  const user = USERS.find(user => user._id === userId);
  const url = encodeURI(`https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${user.address}&destinations=${lat},${lon}&key=AIzaSyAMHSYI2hMp1JUGPES1dvEn9-cW5UZEcNE`);
  return fetch(url).then(res => res.json()).catch(err => console.log(err));
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
  const userId = payload.sender.id;
  const found = USERS.find(elem => elem._id === userId);
  if (!found) {
    chat.conversation((convo) => {
      convo.ask(`Digite sua localização:`, findLocation);
    });
  } else {
    bot.emit('postback:ADRESS_SIM', payload, chat);
  }
});

const findLocation = (payload, convo) => {
  const userId = payload.sender.id;
  let text = "";
  if (payload.message.text !== undefined)
    text = payload.message.text;
  getLocation(text).then((res) => {
    var address = res.results[0].formatted_address;
    const found = USERS.find(elem => elem._id === userId);
    if (!found) {
      USERS.push({ _id: payload.sender.id, address });
    } else {
      USERS = USERS.filter(elem => elem._id !== userId);
      USERS.push({ _id: payload.sender.id, address });
    }
    convo.say({
      text: 'Sua localização é ' + address + '?',
      quickReplies: [
        { content_type: 'text', title: 'Sim', payload: 'ADRESS_SIM' },
        { content_type: 'text', title: 'Não', payload: 'ADRESS_NAO' }
      ]
    }, { typing: true });
  });
};

bot.on('attachment', (payload, chat) => { });

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
  const userId = payload.sender.id;
  const ongName = payload.postback.payload.split(':')[1].trim();
  FB.api(
    `/${ongName}/events`,
    'GET',
    { limit: 5, since: new Date().toISOString() },
    function (response) {
      let requests = response.data.map((event) => {
        return function (callback) {
          FB.api(
            `/${event.id}/picture`,
            'GET',
            { "type": "large", redirect: false },
            function (response) {
              callback(null, { event, image_url: response.data.url });
            }
          );
        };
      });
      async.parallel(requests, function (err, results) {
        const elements = [];
        results.forEach((obj, i) => {
          elements.push({
            title: obj.event.name,
            image_url: obj.image_url,
            subtitle: obj.event.description.trunc(80),
            buttons: [
              //   {
              //   type: "web_url",
              //   url: `https://facebook/events/${obj.event.id}`,
              //   title: "Ver evento"
              // }, 
              {
                type: "postback",
                title: `Descrição completa`,
                payload: `ONG_EVENT:${obj.event.id}`
              }]
          });
        });
        chat.say(`Aqui está algumas eventos da ong ${ongName} perto de você`).then(() => {
          chat.sendGenericTemplate(elements, { typing: true });
        });
        // const elemsIndexes = [];
        // const reqs = results.map((obj, index) => {
        //   if (obj.event.place.location !== undefined) {
        //     elemsIndexes.push(index);
        //     const lat = obj.event.place.location.latitude;
        //     const lon = obj.event.place.location.longitude;
        //     return function (callback) {
        //       getDistance(userId, lat, lon).then((res) => {
        //         callback(null, res.rows[0].elements[0].distance.text);
        //       });
        //     }
        //   };
        // });
        // async.parallel(reqs, function (err, results) {
        //   results.forEach((distance, index) => {
        //     elements[elemsIndexes[index]].title = elements[elemsIndexes[index]].title + ' ' + distance;
        //   });
        //   chat.say(`Aqui está algumas eventos da ong ${ongName} perto de você`).then(() => {
        //     chat.sendGenericTemplate(elements, { typing: true });
        //   });
        // });
      });
    });
});

bot.on('postback:ONG_ABOUT', (payload, chat) => {
  const ongName = payload.postback.payload.split(':')[1];
  console.log(ongName);
  FB.api(
    `/${ongName}`,
    'GET',
    { fields: "about" },
    function (response) {
      if (response.about && response.about.length > 6) {
        chat.say(response.about, { typing: true });
      } else {
        chat.say('Infelizmente não sei muito sobre essa instituição!');
      }
    }
  );
});

bot.on('quick_reply:ADRESS_SIM', (payload, chat) => {
  const userId = payload.sender.id;
  const requests = ONGs.map((ong) => {
    return function (callback) {
      FB.api(
        `/${ong}/picture`,
        'GET',
        { "type": "large", redirect: false },
        function (response) {
          callback(null, response.data.url);
        }
      );
    }
  });
  async.parallel(requests, function (err, results) {
    const elements = [];
    results.forEach((image_url, i) => {
      elements.push({
        title: ONGs[i],
        image_url,
        buttons: [{
          type: "postback",
          title: `Sobre`,
          payload: `ONG_ABOUT:${ONGs[i]}`
        }, {
          type: "postback",
          title: `Eventos`,
          payload: `ONG_EVENT: ${ONGs[i]}`
        }]
      });
    });
    chat.say('Aqui está algumas ONGs próximas a você').then(() => {
      chat.sendGenericTemplate(elements, { typing: true });
    });
  });
});

bot.start(8080);