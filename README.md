# LotusBot
A Discord bot based on discord.io, for use with the game Warframe, developed by Digital Extremes.

## Disclaimer

All assets and items are property of Digital Extremes. I do not own any of the images or item-based data, all due credit goes to them. I only own the code used to fetch the information this bot needs.

## Install

1. Make sure you have [node.js](https://nodejs.org) installed, as well as _npm_. 
2. In your bot directory, run `npm update`, to install all the node dependencies (should be downloaded to a folder called node_modules).
3. Create a file called `auth.json`, and inside it, place this code (replace <Your-token-here> with the token you obtained from discord):
```
{
"token":"<Your-token-here>"
}
```
4. After the dependencies are installed, execute the bot with `node bot.js`. 
5. If everything went smoothly, the terminal should reply with your bot's login status in the server (bot name and server ID). If you failed in any step, get in contact with me and I'll try to help.

## Bot commands
- `[<item name>]`
Finds <item name> in the database, and returns its information (specific attributes controlled via _!track_ and _!untrack_. This command searches for the pattern in the entire message, and so a message like "_I just finished my [soma] and my [octavia]._" is valid and returns both items.

- `!track <attribute name>`
Adds <attribute name> to list of attributes to return (health, shield, drop locations, components...).

- `!untrack <attribute name>`
Removes <attribute name> from list of attributes to return.

- `!<attribute name> <item name>`
Tries to fetch <item name>'s <attribute name>, as in Rhino's shields, or Helios' components, and prints that if it finds a valid response.

- `!price <prime part>`
Looks up <prime part>'s average prices over the last day in warframe.market, and returns that value.

- `!cetus`
Retrieves the time until the next day/night in Cetus and the Plains of Eidolon.

- `!baro`
Retrieves information about when Baro Ki'Teer, the Void Trader, is arriving/leaving, and which Relay.

- `!alerts`
Retrieves information about the ongoing alerts (time remaining, enemy levels, and rewards). _Still in alpha, especially the rewards display._

- `!fissures`
Retrieves information about the ongoing void fissures (time remaining, enemy levels and tier).

- `!sorties`
_Work in progress._

All the bot commands can be shortened to their first letter, when unambiguous (e.g. `!alerts` = `!a`)