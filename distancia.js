'use strict';
 
const request = require('request');
 
var begin = {
  lat: -23.5246611,
  lon: -46.7313022
}
 
var end = {
  lat: -20.3886024,
  lon: -44.4938625
}
 
var origin = begin.lat + ',' + begin.lon;
var destination = end.lat + ',' + end.lon;
 
var url = "https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=" + origin + "&destinations=" + destination + "&key=AIzaSyAMHSYI2hMp1JUGPES1dvEn9-cW5UZEcNE";
 
request(url, function(error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log(body); // body contém distância, duração do trajeto e outras informações úteis
  } else {
    console.log('Erro: ', error);
    console.log('Status Code: ', response.statusCode);
  }
})