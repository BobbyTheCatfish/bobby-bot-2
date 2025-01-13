// @ts-check
const Augur = require('augurbot-ts'),
  u = require('../utils/utils'),
  Module = new Augur.Module();

// Join message
Module.addEvent('guildMemberAdd', async (member) => {
  try {
    // see if the server has opted into welcomes
    const preferences = await u.db.configs.get(member.guild.id);
    if (!preferences?.welcomeChannel) return;
    const welcome = [
      "Welcome",
      "Hi there",
      "Glad to have you here",
      "Ahoy",
      "Howdy",
      "Sup",
      "Salutations",
      "Greetings",
      "Hi",
      "Bonjour",
      "Buenos dias",
      "Hey",
      "Howdy-do",
      "What's up",
      "Aloha",
    ];
    const info1 = [
      "Take a look at",
      "Check out",
      "Head on over to",
    ];
    const info2 = [
      "to get started.",
      "for some basic community rules.",
      "and then join in on the fun!"
    ];
    const welcomeString = `${u.rand(welcome)}, ${member}! ${u.rand(info1)} the rules channel ${u.rand(info2)}`;
    const channel = member.guild.channels.cache.get(preferences.welcomeChannel);
    if (channel?.isSendable()) channel.send(welcomeString).catch(u.noop);
  } catch (error) {
    u.errorHandler(error, `Welcome Message - ${member.guild.id}`);
  }
});

module.exports = Module;