'use strict';

const BootBot = require('bootbot');
const config = require('config').get("FacebookBot");
const async = require('async');
const fetch = require('node-fetch');
const { FB } = require('fb');
const calculateDistance = require('./distance');

const bot = new BootBot({
    accessToken: config.get('access_token'),
    verifyToken: config.get('verify_token'),
    appSecret: config.get('app_secret')
});

// https://www.facebook.com/CadiBrasil/
// https://www.facebook.com/projetoabraco
// https://www.facebook.com/ONGArtsol/

const ONGs = [
  { name: 'RockBicho.org', fbId: '1276897339056454', lat: -23.548880923859, lng: -46.64794921875 },
  // PR
  { name: 'CADI Brasil', fbId: 'CadiBrasil', lat: -25.6628343, lng: -49.3077648 },
  // Osasco
  { name: 'Amamos', fbId: 'amamoscasadeacolhimento', lat: -23.5328871, lng: -46.7919978 },
  // SP
  { name: 'Projeto Abraço', fbId: 'projetoabraco', lat: -23.6201553, lng: -46.6513593 },
  // Bebedouro
  { name: 'Artsol', fbId: 'ONGArtsol', lat: -20.94967433, lng: -48.4795696 },
  // Campinas
  { name: 'Sonhar Acordado', fbId: 'sonharacordadocampinas', lat: -22.9098833, lng: -47.0625812 },
  // SP
  { name: 'Sonhar Acordado', fbId: 'ONGSonharAcordadoSP', lat: -23.5505199, lng: -46.63330939999999 },
  // SP
  { name: 'Atados', fbId: 'atadosjuntandogenteboa', lat: -23.5505199, lng: -46.63330939999999 },
  // SP
  { name: 'Cão sem Dono', fbId: 'caosemdono', lat: -23.5505199, lng: -46.63330939999999 },
  // Jaguariuna
  { name: 'Xodó de Bicho', fbId: 'xododebicho', lat: -22.7042272, lng: -46.9855088 },
];

let USERS = [];

// { id, address, lat, lng, notifications: [{}] }

function formatTime(time) {
  let today = new Date(time);
  let dd = today.getDate();
  let mm = today.getMonth() + 1;
  let minutes = today.getMinutes();
  let hours = today.getHours();

  let yyyy = today.getFullYear();
  if (dd < 10) {
    dd = '0' + dd;
  }
  if (mm < 10) {
    mm = '0' + mm;
  }
  if (minutes < 10) {
    minutes = '0' + minutes;
  }
  if (hours < 10) {
    hours = '0' + hours;
  }
  return `${dd}/${mm}/${yyyy} às ${today.getHours()}:${minutes}`;
}

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

bot.setGreetingText('Você gostaria de saber mais sobre eventos sociais?');
bot.setGetStartedButton((payload, chat) => {
  console.log('GET_STARTED');
  chat.sendGenericTemplate([{
    "title": "Olá, eu sou Collab! Muito prazer. Como posso lhe ajudar?",
    "image_url": "http://blog.fmh.org/wp-content/uploads/2015/05/Volunteer-Hands-and-Swoosh-011-622x349.png",
    "subtitle": "Para interagir comigo clique no ícone do menu",
    "buttons": [{
      "type": "postback",
      "title": "ONGs próximas a mim",
      "payload": "MENU_FIND"
    }, {
      type: "web_url",
      url: "http://collab.burrow.io/",
      title: "Cadastrar nova ONG",
      webview_height_ratio: "compact"
    }]
  }]
  );
});

bot.setGreetingText('Quer receber notificações sobre eventos de ONG\'s?');
bot.setPersistentMenu([{
  "type": "postback",
  "title": "📖 Lista de ONGs",
  "payload": "MENU_FIND"
}, {
  "type": "postback",
  "title": "📒 Notificações",
  "payload": "MENU_NOTIFICATIONS"
}, {
  "type": "postback",
  "title": "🏠 Mudar localização",
  "payload": "PERSISTENT_MENU_LOCATION"
}]);

const findLocation = (payload, convo) => {
  const userId = payload.sender.id;
  if (payload !== undefined && payload.message !== undefined && payload.message.text !== undefined) {
    const text = payload.message.text;
    console.log('LOCATION', text);
    getLocation(text).then((res) => {
      const address = res.results[0].formatted_address;
      const lat = res.results[0].geometry.location.lat;
      const lng = res.results[0].geometry.location.lng;
      const found = USERS.find(elem => elem._id === userId);
      if (!found) {
        USERS.push({ _id: payload.sender.id, address, lat, lng });
      } else {
        found.address = address;
        found.lat = lat;
        found.lng = lng;
      }
      convo.say({
        text: 'Sua localização é ' + address + '?',
        quickReplies: [
          { content_type: 'text', title: 'Sim', payload: 'ADDRESS_YES' },
          { content_type: 'text', title: 'Não', payload: 'ADDRESS_NO' }
        ]
      }, { typing: true });
    });
  } else {
    convo.say('Tive problemas em achar sua localização').then(() => {
       convo.say('Você pode tentar novamente?');
       convo.end();
    });
  }
};

const changeLocation = (payload, convo) => {
  const text = payload.message.text;
  if (text.toLowerCase().trim() === 'sim') {
    convo.say('Legal!').then(() => {
      convo.ask('Qual é o novo endereço?', findLocation);
    });
  }
};

bot.on('postback:PERSISTENT_MENU_LOCATION', (payload, chat) => {
  chat.conversation((convo) => {
    convo.ask({
      text: `Você deseja mudar sua localização?`,
      quickReplies: ['Sim', 'Não']
    }, changeLocation);
  });
});

bot.on('quick_reply:MENU_FIND', (payload, chat) => {
  bot.emit('postback:MENU_FIND', payload, chat);
});

bot.on('postback:MENU_FIND', (payload, chat) => {
  console.log(JSON.stringify(payload, null, 2));
  const userId = payload.sender.id;
  const found = USERS.find(elem => elem._id === userId);
  if (!found) {
    chat.conversation((convo) => {
      convo.ask('Digite sua localização:', findLocation);
    });
  } else {
    bot.emit('quick_reply:ADDRESS_YES', payload, chat);
  }
});

bot.on('attachment', (payload, chat) => { });

bot.hear(['Olá', 'Oi', 'começar', 'comecar'], (payload, chat) => {
  chat.getUserProfile().then((user) => {
    chat.say({
      text: `Olá ${user.first_name}, você gostaria de colaborar e fazer a diferença no mundo?`,
      quickReplies: [
        { content_type: 'text', title: 'Sim', payload: 'START_YES' },
        { content_type: 'text', title: 'Não', payload: 'START_NO' },
      ]
    }, { typing: true });
  });
});

bot.hear(['mudar local', 'trocar local'], (payload, chat) => {
  bot.emit('postback:PERSISTENT_MENU_LOCATION', payload, chat);
});

bot.hear(['Listar'], (payload, chat) => {
  bot.emit('postback:MENU_FIND', payload, chat);
});

bot.on('quick_reply:START_YES', (payload, chat) => {
  console.log('START_YES');
  chat.getUserProfile().then((user) => {
    chat.say(`Que legal ${user.first_name}! 😄`).then(() => {
      chat.say({
        text: 'Você quer ver uma lista de ONGs próximas a você?',
        quickReplies: [
          { content_type: 'text', title: 'Claro', payload: 'MENU_FIND' },
          { content_type: 'text', title: 'Não posso agora', payload: 'START_NO' }
        ]
      }, { typing: true });
    });
  });
});

bot.on('quick_reply:START_NO', (payload, chat) => {
  console.log('START_NO');
  chat.say('Ah, que pena! Mas tudo bem, assim que você quiser, estarei disponível, só mandar um oi!', { typing: true });
});

bot.on('postback:ONG_EVENT', (payload, chat) => {
  const userId = payload.sender.id;
  const ongId = payload.postback.payload.split(':')[1].trim();
  const ongObj = ONGs.find(ong => ong.fbId === ongId);
  const currentUser = USERS.find(elem => elem._id === userId);
  // if (USERS.length === 0) {
  //   USERS.push({
  //     _id: "1237871979633733",
  //     address: 'Fazenda Rio Grande, PR',
  //     lat: -25.6628343,
  //     lng: -49.3077648
  //   });
  // }
  FB.api(
    `/${ongId}/events`,
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
        let elements = [];
        requests = [];
        results.forEach((obj) => {
          if (obj.event.place.location !== undefined) {
            console.log(obj.event.start_time);
            console.log(obj.event.end_time);
            const start_time = formatTime(obj.event.start_time);
            const end_time = formatTime(obj.event.end_time);
            elements.push({
              title: obj.event.name,
              image_url: obj.image_url,
              subtitle: `Início ${start_time}\nTérmino ${end_time}`,
              buttons: [
                {
                  type: "web_url",
                  url: "https://www.facebook.com/events/" + obj.event.id,
                  title: "Visualizar evento",
                  webview_height_ratio: "compact"
                },
                {
                  type: "postback",
                  title: `Notificar-me`,
                  payload: `EVENT_NOTIFY:${obj.event.id}:${obj.event.name}`
                }]
            });
            const lat = obj.event.place.location.latitude;
            const lng = obj.event.place.location.longitude;
            if (currentUser) {
              let func = function (callback) {
                getDistance(userId, lat, lng).then((res) => {
                  callback(null, res.rows[0].elements[0].distance.text);
                });
              };
              requests.push(func);
            }
          }
        });
        async.parallel(requests, function (err, results) {
          let count = 0;
          results.forEach((distance, index) => {
            if (parseFloat(distance.split(' ')[0]) <= 50.0) {
              elements[index].subtitle += "\n" + distance.replace('.', ',');
              count++;
            } else {
              elements[index] = null;
            }
          });
          elements = elements.filter(element => element !== null);
          console.log('COUNT', count);
          if (count > 0) {
            chat.say(`Aqui estão alguns eventos da ONG ${ongObj.name} perto de você.`).then(() => {
              chat.sendGenericTemplate(elements, { typing: true });
            });
          } else {
            chat.say('Uma pena... 😔').then(() => {
              chat.say('Esta ONG não tem nenhum evento planejado pro momento...', { typing: true });
            });
          }
        });
      });
    });
});

const notifyEvent = (payload, convo) => {
  const userId = payload.sender.id;
  const text = payload.message.text;
  if (text.toLowerCase().trim() === 'sim') {
    const currentUser = USERS.find(elem => elem._id === userId);
    if (currentUser.notifications === undefined) {
      currentUser.notifications = [];
    }
    const eventName = convo.get('eventName');
    const eventId = convo.get('eventId');
    currentUser.notifications.push({ fbId: eventId, name: eventName });
    console.log(JSON.stringify(currentUser, null, 2));
    convo.say('OK! Você será notificado. 😉 ⏰', { typing: true });
  }
  convo.end();
};

bot.on('postback:EVENT_NOTIFY', (payload, chat) => {
  const eventId = payload.postback.payload.split(':')[1].trim();
  const eventName = payload.postback.payload.split(':')[2].trim();
  chat.getUserProfile().then((user) => {
    chat.conversation((convo) => {
      convo.set('eventName', eventName);
      convo.set('eventId', eventId);
      convo.ask({
        text: `${user.first_name}, você confirma que deseja ser notificado do evento ${eventName}?`,
        quickReplies: ['Sim', 'Não']
      }, notifyEvent, { typing: true });
    });
  });
});

bot.on('postback:MENU_NOTIFICATIONS', (payload, chat) => {
  const userId = payload.sender.id;
  const currentUser = USERS.find(elem => elem._id === userId);
  if (currentUser.notifications === undefined) {
    currentUser.notifications = [];
  }
  chat.getUserProfile().then((user) => {
    let text = `${user.first_name}, você tem os seguintes eventos:`;
    currentUser.notifications.forEach((event) => {
      text += `\nNome: ${event.name}`;
    });
    chat.say(text, { typing: true });
  });
});

bot.on('postback:ONG_ABOUT', (payload, chat) => {
  const ongName = payload.postback.payload.split(':')[1];
  console.log('ONG_ABOUT');
  FB.api(
    `/${ongName}`,
    'GET',
    { fields: "about,description" },
    function (response) {
      let message;
      if (response.about && response.description == null)
        message = response.about;
      else if (response.description && response.about == null)
        message = response.description;
      else if (response.description && response.about)
        message = response.about + '.' + response.description;
      else
        message = 'Infelizmente não sei muito sobre essa instituição!';

      chat.say(message, { typing: true });
    }
  );
});

bot.on('quick_reply:TALK_SIM', (payload, chat) => {
  chat.say('Excelente, você pode colaborar participando ou doando para ONG\'s').then(() => {
    bot.emit('quick_reply:ADDRESS_YES', payload, chat);
  });
});

bot.on('quick_reply:TALK_BYE', (payload, chat) => {
  chat.say('Tudo bem, mas não se esqueça que estaremos aqui caso mude de ideia!! ;)', { typing: true });
});

bot.on('quick_reply:ADDRESS_YES', (payload, chat) => {
  const userId = payload.sender.id;
  const currentUser = USERS.find(elem => elem._id === userId);
  let requests = [];
  let selectedOngs = [];
  // console.log('user lat: ' + currentUser.lat + 'user lng: ' + currentUser.lng);
  ONGs.forEach((ong) => {
    let func = function (callback) {
      FB.api(
        `/${ong.fbId}/picture`,
        'GET',
        { "type": "large", redirect: false },
        function (response) {
          callback(null, response.data.url);
        }
      );
    }
    // console.log('ong lat: ' + ong.lat + 'ong lng: ' + ong.lng);
    if (calculateDistance(currentUser.lat, currentUser.lng, ong.lat, ong.lng) <= 60) {
      requests.push(func);
      selectedOngs.push(ong);
    }
  });
  async.parallel(requests, function (err, results) {
    const elements = [];
    results.forEach((image_url, i) => {
      elements.push({
        title: selectedOngs[i].name,
        image_url,
        buttons: [{
          type: "postback",
          title: `Sobre`,
          payload: `ONG_ABOUT:${selectedOngs[i].fbId}`
        }, {
          type: "web_url",
          url: "https://www.paypal.com/",
          title: "Doação",
          webview_height_ratio: "compact"
        }, {
          type: "postback",
          title: `Eventos`,
          payload: `ONG_EVENT: ${selectedOngs[i].fbId}`
        }]
      });
    });
    chat.say('Aqui estão algumas ONGs próximas a você').then(() => {
      chat.sendGenericTemplate(elements, { typing: true });
    });
}

bot.on('quick_reply:ADRESS_SIM', (payload, chat) => {
    getOngs(payload, chat);
});

bot.hear([/Eventos da/, /Eventos do/], (payload, chat) => {
  const ongName = payload.message.text.split(' ')[2];
  console.log(ongName);
  payload.postback = {
    payload: 'ONG_EVENT:' + ongName
  };
  bot.emit('postback:ONG_EVENT', payload, chat);
});

bot.hear([/Sobre/], (payload, chat) => {
  const ongName = payload.message.text.split(' ')[1];
  console.log(ongName);
  payload.postback = {
    payload: 'ONG_ABOUT:' + ongName
  };
  bot.emit('postback:ONG_ABOUT', payload, chat);
});


// bot.on('message', (payload, chat, data) => {
//   if (data.captured) { return; }
//   chat.say(`Não entendi sua pergunta!`, { typing: true });
// });

bot.start(8080);