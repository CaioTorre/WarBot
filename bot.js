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

var wantAttributes = {
	'uniqueName': [
		{
			'want':0,
			'alias':'Unique Name'
		}
	],
	'name': [
		{
			'want':1,
			'alias':'Name'
		}
	],
	'description': [
		{
			'want':1,
			'alias':'Description'
		}
	],
	//Warframes
	'health': [
		{
			'want':1,
			'alias':'Health'
		}
	],
	'shield': [
		{
			'want':1,
			'alias':'Shield'
		}
	],
	'armor': [
		{
			'want':1,
			'alias':'Armor'
		}
	],
	'stamina': [
		{
			'want':0,
			'alias':'Stamina'
		}
	],
	'power': [
		{
			'want':1,
			'alias':'Energy'
		}
	],
	'abilities': [
		{
			'want':1,
			'alias':'Abilities'
		}
	],
	'type': [
		{
			'want':0,
			'alias':'Type'
		}
	],
	'buildPrice': [
		{
			'want':0,
			'alias':'Build Price'
		}
	],
	'buildTime': [
		{
			'want':0,
			'alias':'Build Time'
		}
	],
	'skipBuildTimePrice': [
		{
			'want':0,
			'alias':'Skip Build Time Price'
		}
	],
	'buildQuantity': [
		{
			'want':0,
			'alias':'Build Quantity'
		}
	],
	'consumeOnBuild': [
		{
			'want':0,
			'alias':'Consume Blueprint on Build'
		}
	],
	'components': [
		{
			'want':1,
			'alias':'Components'
		}
	],
	'imageName': [
		{
			'want':0,
			'alias':'Image Name'
		}
	],
	'category': [
		{
			'want':0,
			'alias':'Category'
		}
	],
	'tradable': [
		{
			'want':1,
			'alias':'Tradable'
		}
	],
	'patchlogs': [
		{
			'want':0,
			'alias':'Patchlogs'
		}
	],
	//Mods
	'polarity': [
		{
			'want':1,
			'alias':'Polarity'
		}
	],
	'rarity': [
		{
			'want':0,
			'alias':'Rarity'
		}
	],
	'baseDrain': [
		{
			'want':0,
			'alias':'Base Drain'
		}
	],
	'fusionLimit': [
		{
			'want':0,
			'alias':'Fusion Limit'
		}
	],
	//Primary
	'secondsPerShot': [
		{
			'want':0,
			'alias':'Seconds per shot'
		}
	],
	'damagePerShot': [
		{
			'want':0,
			'alias':'Damage per shot'
		}
	]
	//INCOMPLETE
	
};

bot.on('ready', function(evt) {
	logger.info('Connected');
	logger.info('Logged in as: ');
	logger.info(bot.username + '-(' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
	if (bot.id != userID) {
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
				file: './img/' + selectedItem.imageName
			});
			var mess = "";
			for (var attribute in selectedItem) {
				switch (attribute) {
					case 'abilities':
						mess += 'abilities:\n';
						var i = 1;
						var abs = selectedItem[attribute]
						for (var ab in abs) {
							mess += '\t' + i + '. ' + abs[ab]['name'] + ": " + abs[ab]['description'] + '\n';
							i += 1;
						}
						break;
						
					default:
						if (attribute != 'uniqueName' && attribute != 'imageName' && attribute != 'drops' && attribute != 'patchlogs') {
							mess += attribute[0].toUpperCase() + attribute.substring(1) + ': ' + selectedItem[attribute] + '\n';
							logger.info('Appending ' + attribute + ' (' + selectedItem[attribute] + ')');
						}
				}
			}
			bot.sendMessage({
				to: channelID,
				message: mess
			});
			
		} else {
			logger.info('No item found!');
		}
	} else {
		logger.info('Received own message!');
	}
});
