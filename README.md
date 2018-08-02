# LotusBot
A Discord bot based on discord.io, for use with the game Warframe, developed by Digital Extremes.

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


All the bot commands can be shortened to their first letter, when unambiguous (`!alerts` = `!a`)