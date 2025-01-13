// @ts-check
const u = require("./regUtils");
const Discord = require("discord.js");

const welcome = new u.sub()
  .setName("welcome")
  .setDescription("Set up the welcome message")
  .addChannelOption(
    new u.channel()
      .setName("channel")
      .setDescription("The channel to send messages to (Leave blank to disable)")
      .setRequired(false)
  );

const logs = new u.sub()
  .setName("moderation")
  .setDescription("Set up moderation tools")
  .addChannelOption(
    new u.channel()
      .setName("logs-channel")
      .setDescription("The channel to send logs to (Leave blank to disable)")
      .setRequired(false)
  )
  .addBooleanOption(
    new u.bool()
      .setName("chat-filters")
      .setDescription("Enable or disable language filters")
      .setRequired(false)
  );

module.exports = new u.cmd()
  .setName("config")
  .setDescription("Configure bot settings")
  .addSubcommand(logs)
  .addSubcommand(welcome)
  .setContexts(u.context.Guild)
  .setDefaultMemberPermissions(new Discord.PermissionsBitField().add("ManageGuild").bitfield);
