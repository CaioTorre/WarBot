var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
var xhr;
var latestMarketChannelID;
var awaitingMarketResponse = 0;
var marketDataHeader;

const Items = require('warframe-items');
const items = new Items();

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

function processMarketStats(e) {
	logger.info('readystate = ' + xhr.readyState + ' | status = ' + xhr.status);
	if (xhr.readyState == 4 && xhr.status == 200 && awaitingMarketResponse == 1) {
		var itemStats = JSON.parse(xhr.responseText);
		var latest48Hours = itemStats['payload']['statistics']['48hours'];
		var latestPriceAVG = latest48Hours[latest48Hours.length - 1]['avg_price'];
		logger.info('Sending market data to channel ID ' + latestMarketChannelID); 
		bot.sendMessage({
			to: latestMarketChannelID,
			message: marketDataHeader + latestPriceAVG + ' platinum __(warframe.market)__'
		});
		awaitingMarketResponse = 0;
	} else {
		if (xhr.readyState == 4 && xhr.status == 404 && awaitingMarketResponse == 1) {
			bot.sendMessage({
				to: latestMarketChannelID,
				message: 'I was unable to find that item on __warframe.market__'
			});
			awaitingMarketResponse = 0;
		}
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
							message: 'Welcome to LotusBot, Tenno! Try these help commands, or ask a moderator for help:\n```\n!help track\n!help untrack\n!help attributes\n!help price```'
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
					//var selectedItem = slowFetch(testName);
					//if (selectedItem != null) {
						//testName += '_' + args[args.length - 1]; //Add it back 
						var linkName = testName;//.replace(/ /g, "_"); //Rebuild the link name
						logger.info('Resulted in linkname \"' + "https://api.warframe.market/v1/items/" + linkName + "/statistics" + '\"');
						xhr = new XMLHttpRequest();
						latestMarketChannelID = channelID;
						awaitingMarketResponse = 1;
						marketDataHeader = '[' + testName.replace(/_/g, " ") + '] '
						xhr.open('GET', "https://api.warframe.market/v1/items/" + linkName + "/statistics", true);
						xhr.send();
						xhr.onreadystatechange = processMarketStats;
						xhr.addEventListener("readystatechange", processMarketStats, false);
						
					//} else {
					//	bot.sendMessage({
					//		to: channelID,
					//		message: 'I couldn\'t find [' + testName + ' ' + args[args.length - 1] + '] in my database'
					//	});
					//};
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
						var selectedItem = slowFetch(testName);
						if (selectedItem != null) {
							var mess = '';
							switch (args[0]) {
								case 'abilities':
									mess += '[' + testName + '] **Abilities**:\n';
									var i = 1;
									var abs = selectedItem['abilities'];
									for (var ab in abs) {
										mess += '\t' + i + '. ' + abs[ab]['name'] + ": " + abs[ab]['description'] + '\n';
										i += 1;
									}
									break;
									
								case 'components':
									mess += '[' + testName + '] **Components**:\n';
									var comps = selectedItem['components'];
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
									mess += '[' + testName + '] **Damage Types**:\n';
									var damtps = selectedItem['damageTypes'];
									for (var damage in damtps) {
										mess += '\t- ' + damtps[damage] + ' ' + damage + '\n';
									}
									break;
								default:
									logger.info('Fetching attribute ' + args[0]);
									mess += '[' + testName + '] **'+ attributeData[args[0]]['alias'] + '**: ' + selectedItem[args[0]] + '\n';
									//logger.info('Appending ' + args[0] + ' (' + selectedItem[args[0]] + ')');
							}
							//logger.info('Sending message \"' + mess + '\"');
							if (mess.length <= 2000) {
								bot.sendMessage({
									to: channelID,
									//message: '[' + args[1] + '] ' + attributeData[args[0]]['alias'] + ': ' + selectedItem[args[0]]
									message: parseDamageTypes(mess)
								});
							} else {
								bot.sendMessage({
									to: channelID,
									message: 'I\'m sorry, Tenno, but your requested information is too large (' + mess.length + ' characters). Try disabling drop tables (_!untrack drops_).'
								});
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
			if (thingsArray == null) {
				logger.info('No pattern found in message');
			} else {
				logger.info('Regex returned: ' + thingsArray + ' (length ' + thingsArray.length + ')');
				var selectedItem = null;
				
				for (var currentThing in thingsArray) {
				//while ( (regexResult = thingRegex.exec(msg)) ) {
					//logger.info('After regex, message is ' + msg);
					selectedItem = null;
					if (thingsArray != null) {
						//var currentName = regexResult[0];
						logger.info('Current name: ' + thingsArray[currentThing]);
						var extractedThing = thingsArray[currentThing];
						var parsedName = extractedThing.substring(1, extractedThing.length - 1);
						logger.info('Parsed name: ' + parsedName);
						var selectedItem = slowFetch(parsedName);
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
									switch (attribute) {
										case 'abilities':
											mess += '**Abilities**:\n';
											var i = 1;
											var abs = selectedItem[attribute];
											for (var ab in abs) {
												mess += '\t' + i + '. ' + abs[ab]['name'] + ": " + abs[ab]['description'] + '\n';
												i += 1;
											}
											break;
											
										case 'components':
											mess += '**Components**:\n';
											var comps = selectedItem[attribute];
											for (var component in comps) {
												//logger.info('    Current component: ' + comps[component]['name']);
												mess += '\t- ' + comps[component]['itemCount'] + ' x ' + comps[component]['name'] + '\n';
												if (comps[component]['drops'] != undefined && attributeData['drops']['want'] == 1) {
													for (var dropLoc in comps[component]['drops']) {
														//logger.info('        Current drop location: ' + comps[component]dropLoc);
														mess += '\t\t' + comps[component]['drops'][dropLoc]['location'] + ' [' + (100.0 * parseFloat(comps[component]['drops'][dropLoc]['chance'])) + '%]\n';
													}
												}
											}
											break;
										
										case 'damageTypes':
											mess += '**Damage Types**:\n';
											var damtps = selectedItem['damageTypes'];
											for (var damage in damtps) {
												mess += '\t- ' + damtps[damage] + ' ' + damage + '\n';
											}
											break;

										case 'drops':
											mess += '**Drop Table**:\n';
											var drps = selectedItem['drops'];
											for (var dropItem in drps) {
												var currentDrop = drps[dropItem];
												var whiteList = ['Mission Rewards','Transient Rewards','Enemy Mod Tables'];
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
											mess += '**' + attributeData[attribute]['alias'] + '**: ' + selectedItem[attribute] + '\n';
											logger.info('Appending ' + attribute + ' (' + selectedItem[attribute] + ')');
									}
								} else {
									logger.info('Unwanted attribute ' + attribute);
								}
							} else {
								logger.warn('Incomplete list of attributes (' + attribute + ')');
							}
						}
						//bot.sendMessage({
						//	to: channelID,
						//	message: mess
						//});
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
						logger.warn('No such item found!');
					}
				}
				logger.info('Message ended as ' + message);
			}
		}
	} else {
		logger.info('Received own message!');
	}
});
