'use strict';

const BootBot = require('bootbot');
const config = require('config').get("FacebookBot");
const async = require('async');
const fetch = require('node-fetch');
const open = require('open');

var { FB, FacebookApiException } = require('fb');

const bot = new BootBot({
    accessToken: config.get('access_token'),
    verifyToken: config.get('verify_token'),
    appSecret: config.get('app_secret')
});

// https://www.facebook.com/CadiBrasil/
// https://www.facebook.com/projetoabraco
// https://www.facebook.com/ONGArtsol/

const ONGs = ['CadiBrasil', 'ongparaisodosfocinhos', 'amamoscasadeacolhimento', 'projetoabraco', 'ONGArtsol'];

let USERS = [];

String.prototype.trunc = function(n) {
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
                    "title": "📜 Lista de ONG's",
                    "payload": "MENU_FIND"
                },
                {
                    "type": "postback",
                    "title": "🔍 Encontrar evento",
                    "payload": "MENU_FIND"
                }
            ]
        }]
    );
});

bot.setGreetingText('Quer receber notificações sobre eventos de ONG\'s?');
bot.setPersistentMenu([{
        "type": "postback",
        "title": "📜 Lista de ONG's",
        "payload": "PERSISTENT_MENU_FIND"
    },
    {
        "type": "postback",
        "title": "🔍 Encontrar evento",
        "payload": "PERSISTENT_MENU_FIND"
    },
    {
        "type": "postback",
        "title": "🏠 Mudar localização",
        "payload": "PERSISTENT_MENU_LOCATION"
    }
]);


bot.on('attachment', (payload, chat) => {
    console.log('APLICANDO');
});

bot.on('postback:PERSISTENT_MENU_LOCATION', (payload, chat) => {
    chat.conversation((convo) => {
        convo.ask(`Mudar sua localização para:`, changeLocation);
    });
});

function consult(payload, chat) {
    console.log(payload);
    const userId = payload.sender.id;
    const found = USERS.find(elem => elem._id === userId);
    if (!found) {
        chat.conversation((convo) => {
            convo.ask(`Digite sua localização:`, findLocation);
        });
    } else {
        getOngs(payload, chat);
    }
}

bot.on('postback:MENU_FIND', (payload, chat) => {
    consult(payload, chat);
});

bot.on('postback:PERSISTENT_MENU_FIND', (payload, chat) => {
    consult(payload, chat);
});

const changeLocation = (payload, convo) => {
    const userId = payload.sender.id;
    let text = "";
    if (payload.message.text !== undefined)
        text = payload.message.text;
    getLocation(text).then((res) => {
        var address = res.results[0].formatted_address;
        convo.say({
            text: 'Sua localização é ' + address + '?',
            quickReplies: [
                { content_type: 'text', title: 'Sim', payload: 'ADRESS_SIM' },
                { content_type: 'text', title: 'Não', payload: 'ADRESS_NAO' }
            ]
        }, { typing: true }).then(() => {
            convo.end();
        });

    });
};

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
        convo.end();
    });
};

bot.on('attachment', (payload, chat) => {});

bot.hear(['Olá', 'Oi', 'começar', 'comecar'], (payload, chat) => {
    chat.getUserProfile().then((user) => {
        chat.say({
            text: `Olá ${user.first_name}, você gostaria de ajudar de alguma forma ONG's próximas de você?`,
            quickReplies: [
                { content_type: 'text', title: 'Sim', payload: 'TALK_SIM' },
                { content_type: 'text', title: 'Não', payload: 'TALK_BYE' },
            ]
        }, { typing: true });
    });
});

bot.on('quick_reply:TALK_SIM', (payload, chat) => {
    chat.say('Excelente, você pode colaborar participando ou doando para ONG\'s').then(() => {
        getOngs(payload, chat);
    });
});

bot.on('quick_reply:TALK_BYE', (payload, chat) => {
    chat.say('Tudo bem, mas não se esqueça que estaremos aqui caso mude de ideia!! ;)', { typing: true });
});

bot.hear(['ONGs', 'ongs', 'ong', 'Listar ongs', 'listar ongs', 'Lista de ONGs'], (payload, chat) => {
    bot.emit('postback:MENU_FIND', payload, chat);
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
    getEvents(payload, chat);
});


bot.on('postback:ONG_ABOUT', (payload, chat) => {
    const ongName = payload.postback.payload.split(':')[1];
    console.log(ongName);
    FB.api(
        `/${ongName}`,
        'GET', { fields: "about" },
        function(response) {
            if (response.about && response.about.length > 6) {
                chat.say(response.about, { typing: true });
            } else {
                chat.say('Infelizmente não sei lhe informar muito sobre essa instituição!');
            }
        }
    );

});

function getEvents(payload, chat) {
    const userId = payload.sender.id;
    const ongName = payload.postback.payload.split(':')[1].trim();
    if (!parseInt(ongName)) {
        FB.api(
            `/${ongName}/events`,
            'GET', { limit: 5, since: new Date().toISOString() },
            function(response) {
                let requests = response.data.map((event) => {
                    return function(callback) {
                        FB.api(
                            `/${event.id}/picture`,
                            'GET', { "type": "large", redirect: false },
                            function(response) {
                                if (response) {
                                    callback(null, { event, image_url: response.data.url });
                                }
                            }
                        );
                    };
                });
                async.parallel(requests, function(err, results) {
                    const elements = [];
                    results.forEach((obj, i) => {
                        elements.push({
                            title: obj.event.name,
                            image_url: obj.image_url,
                            subtitle: obj.event.description.trunc(80),
                            buttons: [{
                                type: "postback",
                                title: `Ver detalhes`,
                                payload: `ONG_EVENT:${obj.event.id}`
                            }]
                        });
                    });
                    const elemsIndexes = [];
                    requests = [];
                    results.forEach((obj, index) => {
                        if (obj.event.place.location !== undefined) {
                            elemsIndexes.push(index);
                            const lat = obj.event.place.location.latitude;
                            const lon = obj.event.place.location.longitude;
                            let func = function(callback) {
                                getDistance(userId, lat, lon).then((res) => {
                                    callback(null, res.rows[0].elements[0].distance.text);
                                });
                            };
                            requests.push(func);
                        };
                    });
                    async.parallel(requests, function(err, results) {
                        results.forEach((distance, index) => {
                            elements[elemsIndexes[index]].title = elements[elemsIndexes[index]].title + ' - ' + distance;
                        });
                        chat.say(`Aqui estão alguns eventos da ONG ${ongName} perto de você:`).then(() => {
                            chat.sendGenericTemplate(elements, { typing: true });
                        });
                    });
                });
            });
    } else {
        console.log('Click em ' + ongName);
        bot.myemiter('postback:MENU_FIND', payload, chat);
    }
}

function getOngs(payload, chat) {
    const userId = payload.sender.id;
    const requests = ONGs.map((ong) => {
        return function(callback) {
            FB.api(
                `/${ong}/picture`,
                'GET', { "type": "large", redirect: false },
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
                buttons: [{
                    type: "postback",
                    title: `Sobre`,
                    payload: `ONG_ABOUT:${ONGs[i]}`
                }, {
                    type: "postback",
                    title: `Eventos`,
                    payload: `ONG_EVENT:${ONGs[i]}`
                }]
            });
        });
        chat.say('Aqui estão algumas ONGs próximas a você:').then(() => {
            chat.sendGenericTemplate(elements, { typing: true });
        });
    });
}

bot.on('quick_reply:ADRESS_SIM', (payload, chat) => {
    getOngs(payload, chat);
});

bot.start(8080);