var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');

const Items = require('warframe-items');
const items = new Items();

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

var attributeData = {
	'uniqueName': 
	{
		'want':0,
		'alias':'Unique Name'
	},
	'name': 
	{
		'want':1,
		'alias':'Name'
	},
	'description': 
	{
		'want':1,
		'alias':'Description'
	},
	//Warframes
	'health': 
	{
		'want':1,
		'alias':'Health'
	},
	'shield': 
	{
		'want':1,
		'alias':'Shield'
	},
	'armor': 
	{
		'want':1,
		'alias':'Armor'
	},
	'stamina': 
	{
		'want':0,
		'alias':'Stamina'
	},
	'power': 
	{
		'want':1,
		'alias':'Energy'
	},
	'abilities': 
	{
		'want':1,
		'alias':'Abilities'
	},
	'type': 
	{
		'want':0,
		'alias':'Type'
	},
	'buildPrice': 
	{
		'want':0,
		'alias':'Build Price'
	},
	'buildTime': 
	{
		'want':0,
		'alias':'Build Time'
	},
	'skipBuildTimePrice': 
	{
		'want':0,
		'alias':'Skip Build Time Price'
	},
	'buildQuantity': 
	{
		'want':0,
		'alias':'Build Quantity'
	},
	'consumeOnBuild': 
	{
		'want':0,
		'alias':'Consume Blueprint on Build'
	},
	'components': 
	{
		'want':1,
		'alias':'Components'
	},
	'imageName': 
	{
		'want':0,
		'alias':'Image Name'
	},
	'category': 
	{
		'want':0,
		'alias':'Category'
	},
	'tradable': 
	{
		'want':1,
		'alias':'Tradable'
	},
	'patchlogs': 
	{
		'want':0,
		'alias':'Patchlogs'
	},
	'sex':
	{
		'want':0,
		'alias':'Gender'
	},
	//Mods
	'polarity': 
	{
		'want':1,
		'alias':'Polarity'
	},
	'rarity': 
	{
		'want':0,
		'alias':'Rarity'
	},
	'baseDrain': 
	{
		'want':0,
		'alias':'Base Drain'
	},
	'fusionLimit': 
	{
		'want':0,
		'alias':'Fusion Limit'
	},
	'drops': 
	{
		'want':0,
		'alias':'Drop table'
	},
	//Primary
	'secondsPerShot': 
	{
		'want':0,
		'alias':'Seconds per shot'
	},
	'damagePerShot': 
	{
		'want':0,
		'alias':'Damage per shot'
	},
	'channeling':
	{
		'want':0,
		'alias':'Channeling'
	},
	'damage':
	{
		'want':0,
		'alias':'Total Damage'
	},
	'damageTypes':
	{
		'want':1,
		'alias':'Damage Types'
	},
	'disposition':
	{
		'want':0,
		'alias':'Disposition'
	},
	'marketCost':
	{
		'want':0,
		'alias':'Market Cost'
	},
	'polarities':
	{
		'want':1,
		'alias':'Polarities'
	},
	'stancePolarity':
	{
		'want':1,
		'alias':'Stance Polarity'
	},
	'tags':
	{
		'want':0,
		'alias':'Tags'
	},
	'vaulted':
	{
		'want':1,
		'alias':'Vaulted'
	},
	'wikiaURL':
	{
		'want':0,
		'alias':'Wikia URL'
	}
	//INCOMPLETE
	
};

bot.on('ready', function(evt) {
	logger.info('Connected');
	logger.info('Logged in as: ');
	logger.info(bot.username + '-(' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
	if (bot.id != userID) {
		if (message[0] == '!') {
			var args = message.substring(1).split(' ');
			switch (args[0]) {
				case 'track':
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
				default:
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
									mess += '[' + testName + '] Abilities:\n';
									var i = 1;
									var abs = selectedItem['abilities'];
									for (var ab in abs) {
										mess += '\t' + i + '. ' + abs[ab]['name'] + ": " + abs[ab]['description'] + '\n';
										i += 1;
									}
									break;
									
								case 'components':
									mess += '[' + testName + '] Components:\n';
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
									mess += '[' + testName + '] Damage Types:\n';
									var damtps = selectedItem['damageTypes'];
									for (var damage in damtps) {
										mess += '\t- ' + damtps[damage] + ' ' + damage + '\n';
									}
									break;
								default:
									logger.info('Fetching attribute ' + args[0]);
									mess += attributeData[args[0]]['alias'] + ': ' + selectedItem[args[0]] + '\n';
									//logger.info('Appending ' + args[0] + ' (' + selectedItem[args[0]] + ')');
							}
							//logger.info('Sending message \"' + mess + '\"');
							bot.sendMessage({
								to: channelID,
								//message: '[' + args[1] + '] ' + attributeData[args[0]]['alias'] + ': ' + selectedItem[args[0]]
								message: mess
							});
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
		} else {
			var thingRegex = /\[(.*)\]/;
			var thingsArray = thingRegex.exec(message);

			logger.info('Got message: ' + message);
			logger.info('Regex returned: ' + thingsArray);
			
			var selectedItem = null;
			if (thingsArray != null) {
				var selectedItem = slowFetch(thingsArray[1]);
			} else {
				logger.info('No item!');
			}
			
			if (selectedItem != null) {
				logger.info('Found item ' + thingsArray[1]);
				bot.uploadFile({
					to: channelID,
					file: './node_modules/warframe-items/data/img/' + selectedItem.imageName
				});
				var mess = "";
				for (var attribute in selectedItem) {
					if (attributeData[attribute] != undefined) {
						//logger.info(attribute + ': ' + attributeData[attribute][0]['want']);
						if (attributeData[attribute]['want'] == 1) {
							switch (attribute) {
								case 'abilities':
									mess += 'Abilities:\n';
									var i = 1;
									var abs = selectedItem[attribute];
									for (var ab in abs) {
										mess += '\t' + i + '. ' + abs[ab]['name'] + ": " + abs[ab]['description'] + '\n';
										i += 1;
									}
									break;
									
								case 'components':
									mess += 'Components:\n';
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
									mess += 'Damage Types:\n';
									var damtps = selectedItem['damageTypes'];
									for (var damage in damtps) {
										mess += '\t- ' + damtps[damage] + ' ' + damage + '\n';
									}
									break;

								default:
									mess += attributeData[attribute]['alias'] + ': ' + selectedItem[attribute] + '\n';
									logger.info('Appending ' + attribute + ' (' + selectedItem[attribute] + ')');
							}
						} else {
							logger.info('Unwanted attribute ' + attribute);
						}
					} else {
						logger.info('Incomplete list of attributes (' + attribute + ')');
					}
				}
				bot.sendMessage({
					to: channelID,
					message: mess
				});
			} else {
				logger.info('No item found!');
			}
		}
	} else {
		logger.info('Received own message!');
	}
});
