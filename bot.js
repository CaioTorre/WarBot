var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
var xhr;
var latestMarketChannelID;
var awaitingMarketResponse = 0;
var awaitingWorldStateResponse = 0;
var marketDataHeader;

const Items = require('warframe-items');
const items = new Items();

const warframeWorldStateURL = 'http://content.warframe.com/dynamic/worldState.php';

var fs = require('fs');

//const primePartNames = ['set','blueprint','chassis','neuroptics','systems','cerebrum','barrel','stock','string','barrel','upper limb'];

//Config log settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {colorize: true});
logger.level = 'debug';

function slowFetch(namelookup) {
	var thisitem
	for (var i = 0, len = items.length; i < len; i++) {
		thisitem = items[i];
		//logger.info('This item: ' + thisitem.name);
		if (thisitem.name.toLowerCase() === namelookup.toLowerCase()) {
			return thisitem;
		}
	}
	return null;
}

//Initialize Discord Bot
var bot = new Discord.Client({token: auth.token, autorun: true});

var attributeData = require('./attribData.json');

bot.on('ready', function(evt) {
	logger.info('Connected');
	logger.info('Logged in as: ');
	logger.info(bot.username + '-(' + bot.id + ')');
});

function find(thing, list) {
	for (var th in list) {
		if (list[th] == thing) {
			return true;
		}
	}
	return false;
}

function parseItemAttribute(item, attribute, single) {
	var mess = '';
	if (single) mess += '[' + item['name'] + '] ';
	switch (attribute) {
		case 'abilities':
			mess += '**Abilities**:\n';
			var i = 1;
			var abs = item['abilities'];
			for (var ab in abs) {
				mess += '\t' + i + '. ' + abs[ab]['name'] + ": " + abs[ab]['description'] + '\n';
				i += 1;
			}
			break;
			
		case 'components':
			mess += '**Components**:\n';
			var comps = item['components'];
			for (var component in comps) {
				//logger.info('    Current component: ' + comps[component]['name']);
				mess += '\t- ' + comps[component]['itemCount'] + ' x ' + comps[component]['name'] + '\n';
				if (comps[component]['drops'] != undefined && attributeData['drops']['want'] == 1) {
					logger.info('Drop data requested...');
					for (var dropLoc in comps[component]['drops']) {
						//logger.info('        Current drop location: ' + comps[component]dropLoc);
						mess += '\t\t' + comps[component]['drops'][dropLoc]['location'] + ' [' + (100.0 * parseFloat(comps[component]['drops'][dropLoc]['chance'])) + '%]\n';
					}
				}
			}
			break;
		
		case 'damageTypes':
			mess += '**Damage Types**:\n';
			var damtps = item['damageTypes'];
			for (var damage in damtps) {
				mess += '\t- ' + damtps[damage] + ' ' + damage + '\n';
			}
			break;
			
		case 'drops':
			mess += '**Drop Table**:\n';
			var drps = item['drops'];
			for (var dropItem in drps) {
				var currentDrop = drps[dropItem];
				var whiteList = ['Mission Rewards','Transient Rewards','Enemy Mod Tables','Cetus Bounty Rewards'];
				if (find(currentDrop['type'], whiteList)) {
					if (currentDrop['location'] != null) {
						mess += '\t- ' + currentDrop['location'];
					}
					if (currentDrop['rotation'] != null) {
						mess += ' [Rotation ' + currentDrop['rotation'] + ']';
					}
					if (currentDrop['chance'] != null) {
						mess += ': ' + (100.0 * parseFloat(currentDrop['chance'])) + '%\n' 
					}
				} else {
					logger.info('Found non-whitelisted drop type (' + currentDrop['type'] + ')');
				}
			}
			break;
			
		default:
			logger.info('Fetching attribute ' + attribute);
			mess += '**'+ attributeData[attribute]['alias'] + '**: ' + item[attribute] + '\n';
	}
	return mess;
}

function parseDamageTypes(originalMessage) {
	//-------------- ELEM DAMAGE TYPES ------------------------
	var parsingMessage = originalMessage.replace('<DT_POISON>',	':skull_crossbones:');
	parsingMessage = parsingMessage.replace('<DT_FIRE>',		':fire:');
	parsingMessage = parsingMessage.replace('<DT_FREEZE>',		':snowflake:');
	parsingMessage = parsingMessage.replace('<DT_ELECTRICITY>',	':zap:');
	
	//-------------- COMP DAMAGE TYPES ------------------------
	parsingMessage = parsingMessage.replace('<DT_CORROSIVE>',	':syringe:');
	parsingMessage = parsingMessage.replace('<DT_GAS>',			':dash:');
	parsingMessage = parsingMessage.replace('<DT_RADIATION>',	':radioactive:');
	parsingMessage = parsingMessage.replace('<DT_VIRAL>',		':space_invader:');
	parsingMessage = parsingMessage.replace('<DT_MAGNETIC>',	':paperclips:');
	parsingMessage = parsingMessage.replace('<DT_EXPLOSION>',	':bomb:');
	
	//-------------- PHYS DAMAGE TYPES ------------------------
	parsingMessage = parsingMessage.replace('<DT_SLASH>',		':knife:');
	parsingMessage = parsingMessage.replace('<DT_IMPACT>',		':hammer:');
	parsingMessage = parsingMessage.replace('<DT_PUNCTURE>',	':bow_and_arrow:');
	
	return parsingMessage;
}

function parseFactions(message){
	var parsingMessage = message.replace('FC_INFESTATION',	':fire: INFESTATION');
	parsingMessage = parsingMessage.replace('FC_GRINEER',	':syringe: GRINEER'); 
	parsingMessage = parsingMessage.replace('FC_CORPUS',	':zap: CORPUS'); 
	
	return parsingMessage;
}

function voidFissureDict(txt) {
	switch (txt[5]) {
		case '1': return 'Lith [T1]'; break;
		case '2': return 'Meso [T2]'; break;
		case '3': return 'Neo [T3]'; break;
		case '4': return 'Axi [T4]'; break;
		default: logger.error('Got unknown void fissure ID (' + txt + ')');
	}
}

bot.on('message', function (user, userID, channelID, message, evt) {
	logger.info('Got message from channel ID ' + channelID);
	message = message.replace(/ +/g, ' ');
	if (bot.id != userID) {
		if (message[0] == '!') {
			var args = message.substring(1).split(' ');
			switch (args[0]) {
				case 'help':
				case 'h':
					if (args.length == 1) {
						bot.sendMessage({
							to: channelID,
							message: 'Welcome to LotusBot, Tenno! Try these help commands, or ask a moderator for help:\n```\n!help track\n!help untrack\n!help attributes\n!help price\n!help events```\nAll of the commands can be shortened to their first letter, if unambiguous (e.g. `!price` = `!p`)'
						});
					} else {
						switch (args[1]) {
							case 'track':
								bot.sendMessage({
									to: channelID,
									message: '`!track <attribute>` adds _<attribute>_ to the list of "interesting" traits, so I will be sure to insert that information the next time you request data about an [item].\nSee also `!list attributes` for a list of attributes that I recognize.'
								});
								break;
							case 'untrack':
								bot.sendMessage({
									to: channelID,
									message: '`!untrack <attribute>` removes _<attribute>_ from the list of "interesting" traits, so I won\'t insert that information the next time you request data about an [item].\nSee also `!list attributes` for a list of attributes that I recognize.'
								});
								break;
							case 'attributes':
								bot.sendMessage({
									to: channelID,
									message: '`!<attribute> <item>` retrieves a specific <attribute> from <item>, if that item has that attribute. Useful if you just need that one bit of information, Tenno!'
								});
								break;
							case 'price':
								bot.sendMessage({
									to: channelID,
									message: '`!price <prime item part>` uses _warframe.market_ data from the past day to inform you a mean value of that <prime item part>.'
								});
								break;
							case 'events':
								var message =	'`!alerts` fetches data about the ongoing alerts (time until expiry, mission type, enemy faction and levels, and rewards (_alpha_))\n'
								message +=		'`!fissures` fetches data about the ongoing void fissures (time until expiry, mission type, and tier)\n'
								message +=		'`!sorties` fetches data about the daily sorties (time until expiry, mission list and modifiers)\n'
								message +=		'`!cetus` fetches data about the day/night cycle in Cetus and the Plains of Eidolon, and returns the time until sunset/sunrise\n'
								message +=		'`!baro` fetches data about Baro Ki\'Teer, the Void Trader (time until arrival/departure, and which relay\n'
								bot.sendMessage({
									to: channelID,
									message: message
								});
								break;
						}
					}
					break;
				case 'list':
				case 'l':
					if (args.length == 2) {
						switch (args[1]) {
							case 'attributes':
								var mess = '**Attribute list**';
								for (var att in attributeData) {
									mess += '\n\t- ' + att + ' (' + attributeData[att]['alias'] + ')';
								}
								bot.sendMessage({
									to: channelID,
									message: mess
								});
							case 'commands':
								var mess = '**Commands list**\n```';
								var cmdlist = ['help', 'track', 'untrack', 'price', 'alerts', 'fissures', 'sorties', 'cetus', 'baro'].sort();
								for (var cmdID in cmdlist) {
									mess += cmdlist[cmdID] + ' (' + cmdlist[cmdID][0] + ')\n';
								}
								bot.sendMessage({
									to: channelID,
									message: mess + '```'
								});
								break;
						}
					} else {
						bot.sendMessage({
							to: channelID,
							message: 'You need to tell me what I should list, Tenno.'
						});
					}
					break;
				case 'track':
				case 't':
					if (attributeData[args[1]] != undefined) {
						attributeData[args[1]]['want'] = 1;
						bot.sendMessage({
							to: channelID,
							message: 'Now tracking ' + args[1]
						});
					} else {
						bot.sendMessage({
							to: channelID,
							message: 'I don\'t know anything about ' + args[1] + '!'
						});
					}
					break;
				case 'untrack':
				case 'u':
					if (attributeData[args[1]] != undefined) {
						attributeData[args[1]]['want'] = 0;
						bot.sendMessage({
							to: channelID,
							message: 'Stopped tracking ' + args[1]
						});
					} else {
						bot.sendMessage({
							to: channelID,
							message: 'I don\'t know anything about ' + args[1] + '!'
						});
					}
					break;
				case 'price':
				case 'p':
					var testName = '';
					for (var cname in args) {
						if (cname > 0 && cname < args.length) {
							if (cname > 1) {
								testName += '_';
							}
							testName += args[cname];
						}
					};
					
					var linkName = testName;//.replace(/ /g, "_"); //Rebuild the link name
					logger.info('Resulted in linkname \"' + "https://api.warframe.market/v1/items/" + linkName + "/statistics" + '\"');
					var marketXHR = new XMLHttpRequest();
					
					var awaitingMarketResponse = 1;
					var marketDataHeader = '[' + testName.replace(/_/g, " ") + '] ';
					
					marketXHR.open('GET', "https://api.warframe.market/v1/items/" + linkName + "/statistics", true);
					marketXHR.send();
					
					marketXHR.addEventListener("readystatechange", function(e) {
						logger.info('readystate = ' + marketXHR.readyState + ' | status = ' + marketXHR.status);
						if (marketXHR.readyState == 4 && marketXHR.status == 200 && awaitingMarketResponse == 1) {
							var itemStats = JSON.parse(marketXHR.responseText);
							var latest48Hours = itemStats['payload']['statistics']['48hours'];
							var latestPriceAVG = latest48Hours[latest48Hours.length - 1]['avg_price'];
							
							bot.sendMessage({
								to: channelID,
								message: marketDataHeader + latestPriceAVG + ' platinum __(warframe.market)__'
							});
							awaitingMarketResponse = 0;
						} else {
							if (marketXHR.readyState == 4 && marketXHR.status == 404 && awaitingMarketResponse == 1) {
								bot.sendMessage({
									to: channelID,
									message: 'I was unable to find that item on __warframe.market__'
								});
								awaitingMarketResponse = 0;
							}
						}
					}, false);
					break;
				
				case 'cetus': //Find whether it's day or night in the Plains of Eidolon
				case 'c':
					logger.info('Requested cetus timedata');
					xhr = new XMLHttpRequest();
					awaitingWorldStateResponse = 1;
					xhr.open('GET', warframeWorldStateURL, true);
					xhr.send();
					//xhr.onreadystatechange = processCetusTime;
					xhr.addEventListener("readystatechange", function(e) {
						logger.info('readystate = ' + xhr.readyState + ' | status = ' + xhr.status);
						if (xhr.readyState == 4 && xhr.status == 200 && awaitingWorldStateResponse == 1) { //Received successfully
							logger.info('Retrieved remote worldState data');
							var worldStateData = JSON.parse(xhr.responseText);
							var syndicate = worldStateData['SyndicateMissions'].find(element => (element['Tag'] == 'CetusSyndicate'));
							var timestamp = Math.floor(syndicate['Expiry']['$date']['$numberLong'] / 1000);
							logger.info('Successfully retrieved Cetus timestamp = ' + timestamp);
							
							//Calculate wibbly wobbly timey wimey stuff
							var time = new Date().getTime() / 1000;
							var start_time = timestamp - 150 * 60; //One day in cetus is 150 IRL minutes
							var irl_time_m = ((time - start_time) / 60) % 150;
							var poe_time_ih = (irl_time_m / 6.25) + 6;
							if (poe_time_ih < 0) poe_time_ih += 24;
							if (poe_time_ih > 24) poe_time_ih -= 24;
							var poe_time_h = Math.floor(poe_time_ih);
							var poe_time_m = Math.floor((poe_time_ih * 60) % 60);
							var poe_time_s = Math.floor((poe_time_ih * 60 * 60) % 60);
							
							var next_interval;
							if (100 > irl_time_m) {
								next_interval = 21;
							} else {
								next_interval = 5;
							}
							
							var poe_until_h = next_interval - (poe_time_h % 24);
							if (poe_until_h < 0) poe_until_h += 24;
							var poe_until_m = 60 - poe_time_m;
							var poe_until_s = 60 - poe_time_s;
							
							var irl_until_in_h = ((poe_until_h + poe_until_m / 60 + poe_until_s / 3600) * 6.25) / 60;
							var irl_until_in_m = 150 - irl_time_m;
							if (irl_until_in_m > 50) irl_until_in_m -= 50;
							
							var irl_until_h = Math.floor(irl_until_in_m / 60);
							var irl_until_m = Math.floor(irl_until_in_m % 60);
							var irl_until_s = Math.floor((irl_until_in_m * 60) % 60);
							
							var time_string = '';
							if (irl_until_h < 10) time_string += '0';
							time_string += irl_until_h + ':';
							if (irl_until_m < 10) time_string += '0';
							time_string += irl_until_m + ':';
							if (irl_until_s < 10) time_string += '0';
							time_string += irl_until_s
							
							if (next_interval == 21) {
								bot.sendMessage({
									to: channelID,
									message: 'Time until :crescent_moon: night in Cetus: ' + time_string
								});
							} else {
								bot.sendMessage({
									to: channelID,
									message: 'Time until :sunny: day in Cetus: ' + time_string
								});
							}
							
							awaitingWorldStateResponse = 0;
						} else {
							if (xhr.readyState == 4 && awaitingWorldStateResponse == 1) {
								logger.info('Request failed with code ' + xhr.status);
								awaitingWorldStateResponse = 0;
							}
						}
					}, false);
					break;
					
				case 'baro':
				case 'b':
					logger.info('Requested baro ki\'teer time data');
					var baroXHR = new XMLHttpRequest();
					baroXHR.open('GET', warframeWorldStateURL, true);
					baroXHR.send();
					awaitingWorldStateResponse = 1;
					baroXHR.addEventListener("readystatechange", function(e) {
						logger.info('readystate = ' + baroXHR.readyState + ' | status = ' + baroXHR.status);
						if (baroXHR.readyState == 4 && baroXHR.status == 200 && awaitingWorldStateResponse == 1) { //Received successfully
							var worldStateData = JSON.parse(baroXHR.responseText);
							var baroData = worldStateData['VoidTraders'].find(element => (element['Character'] == 'Baro\'Ki Teel'));
							var baroArrivalEpoch = baroData['Activation']['$date']['$numberLong'] / 1000;
							if (baroArrivalEpoch != undefined) {
								var currentDate = new Date();
								var baroArrivalDate = new Date(0);
								baroArrivalDate.setUTCSeconds(baroArrivalEpoch);
								logger.info('Current date: ' + currentDate);
								logger.info('Baro    date: ' + baroArrivalDate);
								if (baroArrivalDate > currentDate) {
									logger.info('Baro will arrive');
									var diff_in_seconds = Math.floor(Math.abs(baroArrivalDate.getTime() - currentDate.getTime()) / 1000);
									logger.info('Difference  : ' + diff_in_seconds);
									var diff_string = ':clock: ';
									
									if (diff_in_seconds > 86400) {
										if (Math.floor(diff_in_seconds / 86400) < 10) diff_string += '0';
										diff_string += Math.floor(diff_in_seconds / 86400) + ':';
										diff_in_seconds = diff_in_seconds % 86400;
									}
									
									if (Math.floor(diff_in_seconds / 3600) < 10) diff_string += '0';
									diff_string += Math.floor(diff_in_seconds / 3600) + ':';
									diff_in_seconds = diff_in_seconds % 3600;
									if (Math.floor(diff_in_seconds / 60) < 10) diff_string += '0';
									diff_string += Math.floor(diff_in_seconds / 60) + ':';
									if ((diff_in_seconds % 60) < 10) diff_string += '0';
									diff_string += diff_in_seconds % 60;
									
									diff_string += ' until Baro Ki\'Teer arrives in the ' + baroData['Node'].replace('HUB', '') + ' relay, Tenno';
									
									bot.sendMessage({
										to: channelID,
										message: diff_string
									});
								} else {
									logger.info('Baro will leave');
									var baroLeavingDate = new Date(0);
									var baroLeavingEpoch = baroData['Expiry']['$date']['$numberLong'] / 1000;
									if (baroLeavingEpoch != undefined) {
										baroLeavingDate.setUTCSeconds(baroLeavingEpoch);
										logger.info('Leaving date: ' + baroLeavingDate);
										var diff_in_seconds = Math.floor(Math.abs(baroLeavingDate.getTime() - currentDate.getTime()) / 1000);
										logger.info('Difference  : ' + diff_in_seconds);
										var diff_string = ':money_with_wings: Baro Ki\'Teer is currently in the ' + baroData['Node'].replace('HUB', '') + ' relay, and will leave in ';
										
										if (diff_in_seconds > 86400) {
											if (Math.floor(diff_in_seconds / 86400) < 10) diff_string += '0';
											diff_string += Math.floor(diff_in_seconds / 86400) + ':';
											diff_in_seconds = diff_in_seconds % 86400;
										}
										if (Math.floor(diff_in_seconds / 3600) < 10) diff_string += '0';
										diff_string += Math.floor(diff_in_seconds / 3600) + ':';
										diff_in_seconds = diff_in_seconds % 3600;
										if (Math.floor(diff_in_seconds / 60) < 10) diff_string += '0';
										diff_string += Math.floor(diff_in_seconds / 60) + ':';
										if ((diff_in_seconds % 60) < 10) diff_string += '0';
										diff_string += diff_in_seconds % 60;
										
										bot.sendMessage({
											to: channelID,
											message: diff_string
										});
									} else {
										logger.error('Baro leaving epoch is undefined');
									}
								}
							}
						} else {
							if (baroXHR.readyState == 4 && awaitingWorldStateResponse == 1) {
								logger.info('Request failed with code ' + baroXHR.status);
								awaitingWorldStateResponse = 0;
							}
						}
					}, false);					
					break;
					
				case 'alerts':
				case 'alert':
				case 'a':
					logger.info('Requested alert data');
					
					var alertXHR = new XMLHttpRequest();
					alertXHR.open('GET', warframeWorldStateURL, true);
					alertXHR.send();
					
					var awaitingAlertResponse = 1;
					alertXHR.addEventListener('readystatechange', function(e) {
						if (alertXHR.readyState == 4 && alertXHR.status == 200 && awaitingAlertResponse == 1) {
							var mess = '**Alerts**\n'
							var worldStateData = JSON.parse(alertXHR.responseText);
							var alertData = worldStateData['Alerts'];
							for (var alertID in alertData) {
								var thisAlert = alertData[alertID];
								mess += '\t[**' + thisAlert['MissionInfo']['minEnemyLevel'] + ' - ' + thisAlert['MissionInfo']['maxEnemyLevel'] + '** ' + thisAlert['MissionInfo']['faction'].substring(3).replace('_', ' ') + '] **' + thisAlert['MissionInfo']['missionType'].substring(3).replace('_', ' ') + '**'
								if (thisAlert['MissionInfo']['archwingRequired']) mess += ' :airplane: Archwing'
								
								var currentDate = new Date();
								var alertExDate = new Date(0);
								alertExDate.setUTCSeconds(thisAlert['Expiry']['$date']['$numberLong'] / 1000);
								var diff_in_seconds = Math.abs(alertExDate - currentDate) / 1000;
								
								mess += ' - :clock: '
								if (diff_in_seconds > 60) mess += Math.floor(diff_in_seconds / 60) + 'm';
								mess += Math.floor(diff_in_seconds % 60) + 's' 
									
								
								mess += '\n\t\t:moneybag: ' + thisAlert['MissionInfo']['missionReward']['credits'] + ' credits\n';
								var rewardsAlert = thisAlert['MissionInfo']['missionReward']['items'];
								for (var rewardID in rewardsAlert) {
									//var rewardData = items.find(element => (rewardsAlert[rewardID]
									mess += '\t\t ' + rewardsAlert[rewardID] + '\n';
								}
								mess += '\n'
							}
							bot.sendMessage({
								to: channelID,
								message: mess
							});
							awaitingAlertResponse = 0;
						} else {
							if (alertXHR.readyState == 4 && awaitingAlertResponse == 1) {
								logger.error('Request failed with error ' + alertXHR.status);
								awaitingAlertResponse = 0;
							}
						}
					}, false);
					break;
					
				case 'fissures':
				case 'f':
					logger.info('Requested void fissures data');
					
					var fissuresXHR = new XMLHttpRequest();
					fissuresXHR.open('GET', warframeWorldStateURL, true);
					fissuresXHR.send();
					
					var awaitingFissuresResponse = 1;
					fissuresXHR.addEventListener('readystatechange', function(e) {
						logger.info('readystate = ' + fissuresXHR.readyState + ' | status = ' + fissuresXHR.status);
						if (fissuresXHR.readyState == 4 && fissuresXHR.status == 200 && awaitingFissuresResponse == 1) {
							var mess = '**Void Fissures**\n'
							var worldStateData = JSON.parse(fissuresXHR.responseText);
							var fissuresData = worldStateData['ActiveMissions'];
							logger.info('Got ' + fissuresData.length + ' fissures');
							for (var fissureID in fissuresData) {
								logger.info('Analizing fissure ' + fissureID)
								thisFissure = fissuresData[fissureID];
								
								var currentDate = new Date();
								var fissExpDate = new Date(0);
								fissExpDate.setUTCSeconds(thisFissure['Expiry']['$date']['$numberLong'] / 1000);
								var diff_in_seconds = Math.abs(fissExpDate - currentDate) / 1000;
								mess += '\t:clock: `'
								if (diff_in_seconds > 60) mess += Math.floor(diff_in_seconds / 60) + 'm';
								mess += Math.floor(diff_in_seconds % 60) + 's`' 
								
								mess += '\t' + thisFissure['MissionType'].substring(3).replace('_', ' ') + ' - ' + voidFissureDict(thisFissure['Modifier']) + '\n';
							}
							bot.sendMessage({
								to: channelID,
								message: mess
							});
							awaitingFissuresResponse = 0;
						} else {
							if (fissuresXHR.readyState == 4 && awaitingFissuresResponse == 1) {
								logger.error('Request failed with error ' + fissuresXHR.status);
								awaitingFissuresResponse = 0;
							}
						}
					}, false);
					break;
					
				case 'sorties':
				case 's':
					logger.info('Requested sorties data');
					
					var sortiesXHR = new XMLHttpRequest();
					sortiesXHR.open('GET', warframeWorldStateURL, true);
					sortiesXHR.send();
					
					var awaitingFissuresResponse = 1;
					sortiesXHR.addEventListener('readystatechange', function(e) {
						logger.info('readystate = ' + sortiesXHR.readyState + ' | status = ' + sortiesXHR.status);
						if (sortiesXHR.readyState == 4 && sortiesXHR.status == 200 && awaitingFissuresResponse == 1) {
							var mess = '**Daily Sorties** - '
							var worldStateData = JSON.parse(sortiesXHR.responseText);
							var sortiesData = worldStateData['Sorties'][0];
							var currentDate = new Date();
							var sortExpDate = new Date(0);
							sortExpDate.setUTCSeconds(sortiesData['Expiry']['$date']['$numberLong'] / 1000);
							var diff_in_seconds = Math.abs(sortExpDate - currentDate) / 1000;
							
							logger.info('Seconds til sorties expire = ' + diff_in_seconds);
							if (diff_in_seconds > 3600) mess += Math.floor(diff_in_seconds / 3600) + 'h';
							diff_in_seconds = diff_in_seconds % 3600;
							if (diff_in_seconds > 60) mess += Math.floor(diff_in_seconds / 60) + 'm';
							mess += Math.floor(diff_in_seconds % 60) + 's\n' 
								
							var sortiesVariants = sortiesData['Variants']
							mess += '\t1 - ' + sortiesVariants[0]['missionType'].substring(3) + ' [Modifier = ' + sortiesVariants[0]['modifierType'].substring(16).replace('_', ' ') + ']\n'
							mess += '\t2 - ' + sortiesVariants[1]['missionType'].substring(3) + ' [Modifier = ' + sortiesVariants[1]['modifierType'].substring(16).replace('_', ' ') + ']\n'
							mess += '\t3 - ' + sortiesVariants[2]['missionType'].substring(3) + ' [Modifier = ' + sortiesVariants[2]['modifierType'].substring(16).replace('_', ' ') + ']\n' 
							bot.sendMessage({
								to: channelID,
								message: mess
							});
							awaitingFissuresResponse = 0;
						} else {
							if (sortiesXHR.readyState == 4 && awaitingFissuresResponse == 1) {
								logger.error('Request failed with error ' + sortiesXHR.status);
								awaitingFissuresResponse = 0;
							}
						}
					}, false);
					break;
				default: //------------------------ TRY FOR SPECIFIC ATTRIBUTE ---------------------
					if (attributeData[args[0]] != undefined) {
						var testName = '';
						for (var cname in args) {
							if (cname > 0) {
								if (cname > 1) {
									testName += ' ';
								}
								testName += args[cname];
							}
						}
						logger.info('Parsed name [' + testName + ']');
						//var selectedItem = slowFetch(testName);
						var selectedItem = items.find(element => (element['name'].toLowerCase() == testName.toLowerCase()));
						if (selectedItem != null) {
							var mess = parseItemAttribute(selectedItem, args[0], true);
							if (mess != null) {
								if (mess.length <= 2000) {
									bot.sendMessage({
										to: channelID,
										message: parseDamageTypes(mess)
									});
								} else {
									bot.sendMessage({
										to: channelID,
										message: 'I\'m sorry, Tenno, but your requested information is too large (' + mess.length + ' characters). Try disabling drop tables (_!untrack drops_).'
									});
								}
							} else {
								logger.error('parseItemAttribute returned null!');
							}
						} else {
							bot.sendMessage({
								to: channelID,
								message: 'I don\'t recognize that item'
							});
						}
					} else {
						bot.sendMessage({
							to: channelID,
							message: 'I didn\'t understand that'
						});
					}
			}
		} else { //---------------------------- NO !COMMAND FOUND --------------------------
			var thingRegex = /\[[^\]]*\]/gi;
			var thingsArray = message.match(thingRegex);
			logger.info('Got message: ' + message);
			var failedNames = [];
			if (thingsArray == null) {
				logger.info('No pattern found in message');
			} else {
				logger.info('Regex returned: ' + thingsArray + ' (length ' + thingsArray.length + ')');
				var selectedItem = null;
				
				for (var currentThing in thingsArray) {
					selectedItem = null;
					if (thingsArray != null) {
						//var currentName = regexResult[0];
						logger.info('Current name: ' + thingsArray[currentThing]);
						var extractedThing = thingsArray[currentThing];
						var parsedName = extractedThing.substring(1, extractedThing.length - 1);
						logger.info('Parsed name: ' + parsedName);
						//var selectedItem = slowFetch(parsedName);
						var selectedItem = items.find(element => (element['name'].toLowerCase() == parsedName.toLowerCase()));
					} else {
						logger.info('No items in message!');
					}
					
					if (selectedItem != null) {
						logger.info('Found item ' + parsedName);
						var mess = "";
						for (var attribute in selectedItem) {
							if (attributeData[attribute] != undefined) {
								//logger.info(attribute + ': ' + attributeData[attribute][0]['want']);
								if (attributeData[attribute]['want'] == 1) {
									mess += parseItemAttribute(selectedItem, attribute, false);
								} else {
									logger.info('Unwanted attribute ' + attribute);
								}
							} else {
								logger.warn('Incomplete list of attributes (' + attribute + ')');
							}
						}
						if (mess != null) {
							logger.info('Sending message regarding ' + selectedItem.name);
							if (mess.length <= 2000) {
								if (fs.existsSync('./node_modules/warframe-items/data/img/' + selectedItem.imageName)) {
									bot.uploadFile({
										to: channelID,
										file: './node_modules/warframe-items/data/img/' + selectedItem.imageName,
										message: parseDamageTypes(mess)
									});
								} else {
									logger.warn('Image not found @./node_modules/warframe-items/data/img/' + selectedItem.imageName);
									bot.sendMessage({
										to: channelID,
										message: parseDamageTypes(mess)
									});
								}
							} else {
								bot.sendMessage({
									to: channelID,
									message: 'I\'m sorry, Tenno, but your requested information is too large (' + mess.length + ' characters). Try disabling drop tables (_!untrack drops_).'
								});
							}
						} else {
							logger.error('parseItemAttribute returned null!')
						}
					} else {
						failedNames.push(parsedName);
						logger.warn('No such item found!');
					}
				}
			}
			if (failedNames.length > 0) {
				var origLength = failedNames.length;
				var mess = 'I couldn\'t find information on ';
				if (origLength == 1) {
					mess += failedNames[0];
				} else {
					for (var fail in failedNames) {
						mess += '[' + failedNames[fail] + ']';
						if (fail < origLength - 2) mess += ', ';
						if (fail == origLength - 2) mess += ' or ';
					}
				}
				bot.sendMessage({
					to: channelID,
					message: mess
				});
			}
		}
	} else {
		logger.info('Received own message!');
	}
});
