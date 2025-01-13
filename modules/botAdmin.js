// @ts-check
// This file is a place for all the publicly visible bot diagnostic commands usable primarily only by the head bot dev.

const Augur = require("augurbot-ts"),
  Discord = require("discord.js"),
  fs = require("fs"),
  path = require("path"),
  u = require("../utils/utils");

/** @param {Augur.GuildInteraction<"CommandSlash">} int*/
async function slashBotGtb(int) {
  try {
    await int.editReply("Good night! 🛏");
    await int.client.destroy();
    process.exit();
  } catch (error) {
    u.errorHandler(error, int);
  }
}

/**
 * @param {Augur.GuildInteraction<"CommandSlash">} int
 * @param {Discord.InteractionResponse} msg
 */
async function slashBotPing(int, msg) {
  const sent = await int.editReply("Pinging...");
  return int.editReply(`Pong! Took ${sent.createdTimestamp - msg.createdTimestamp}ms`);
}

/** @param {Augur.GuildInteraction<"CommandSlash">} int*/
async function slashBotPull(int) {
  const spawn = require("child_process").spawn;
  const cmd = spawn("git", ["pull"], { cwd: process.cwd() });
  const stdout = [];
  const stderr = [];
  cmd.stdout.on("data", data => {
    stdout.push(data);
  });

  cmd.stderr.on("data", data => {
    stderr.push(data);
  });

  cmd.on("close", code => {
    if (code === 0) {
      int.editReply(stdout.join("\n") + "\n\nCompleted with code: " + code);
    } else {
      int.editReply(`ERROR CODE ${code}:\n${stderr.join("\n")}`);
    }
  });
}

/** @param {Augur.GuildInteraction<"CommandSlash">} int*/
async function slashBotPulse(int) {
  const client = int.client;
  const uptime = process.uptime();

  const embed = u.embed()
    .setAuthor({ name: client.user.username + " Heartbeat", iconURL: client.user.displayAvatarURL() })
    .setTimestamp()
    .addFields([
      { name: "Uptime", value: `Discord: ${Math.floor(client.uptime / (24 * 60 * 60 * 1000))} days, ${Math.floor(client.uptime / (60 * 60 * 1000)) % 24} hours, ${Math.floor(client.uptime / (60 * 1000)) % 60} minutes\nProcess: ${Math.floor(uptime / (24 * 60 * 60))} days, ${Math.floor(uptime / (60 * 60)) % 24} hours, ${Math.floor(uptime / (60)) % 60} minutes`, inline: true },
      { name: "Reach", value: `${client.guilds.cache.size} Servers\n${client.channels.cache.size} Channels\n${client.users.cache.size} Users`, inline: true },
      { name: "Commands Used", value: `${client.commands.commandCount} (${(client.commands.commandCount / (client.uptime / (60 * 1000))).toFixed(2)}/min)`, inline: true },
      { name: "Memory", value: `${Math.round(process.memoryUsage().rss / 1024 / 1000)}MB`, inline: true }
    ]);
  return int.editReply({ embeds: [embed] });
}

/** @param {Augur.GuildInteraction<"CommandSlash">} int*/
async function slashBotReload(int) {
  let files = int.options.getString("module")?.split(" ") ?? [];

  if (!files) files = fs.readdirSync(path.resolve(__dirname)).filter(file => file.endsWith(".js"));

  for (const file of files) {
    try {
      // @ts-expect-error augur goof, functions correctly
      int.client.moduleHandler.reload(path.resolve(__dirname, file));
    } catch (error) { return u.errorHandler(error, int); }
  }
  return int.editReply("Reloaded!");
}

/** @param {Augur.GuildInteraction<"CommandSlash">} int*/
async function slashBotGetId(int) {
  const mentionable = int.options.getMentionable("mentionable");
  const channel = int.options.getChannel("channel");
  const emoji = int.options.getString("emoji");

  const results = [];
  if (mentionable) results.push({ str: mentionable.toString(), id: mentionable.id });
  if (channel) results.push({ str: channel.toString(), id: channel.id });
  if (emoji) {
    const emojis = emoji.split(" ");
    for (const e of emojis) results.push({ str: e, id: `\\${e}` });
  }
  return int.editReply(`I got the following results:\n${results.map(r => `${r.str}: ${r.id}`).join("\n")}`);
}

/** @param {Augur.GuildInteraction<"CommandSlash">} int*/
async function slashBotRegister(int) {
  const spawn = require("child_process").spawn;
  const cmd = spawn("node", ["register-commands"], { cwd: process.cwd() });
  const stderr = [];
  cmd.stderr.on("data", data => {
    stderr.push(data);
  });
  cmd.on("close", code => {
    if (code === 0) {
      int.editReply("Commands registered! Restart the bot to finish.");
    } else {
      int.editReply(`ERROR CODE ${code}:\n${stderr.join("\n")}`);
    }
  });
}

/** @param {Augur.GuildInteraction<"CommandSlash">} int*/
async function slashBotStatus(int) {
  const stat = int.options.getString("status");
  if (stat) {
    // yes, i want to use an array. no, tscheck wont let me
    if (stat === 'online' || stat === "idle" || stat === "invisible" || stat === "dnd") int.client.user.setActivity(stat);
  }
  const name = int.options.getString("activity", false);
  if (!name && !stat) {
    int.client.user.setActivity();
    return int.editReply("Status reset");
  }
  if (name) {
    const t = int.options.getString("type");
    const type = t ? Discord.ActivityType[t] : undefined;
    const url = int.options.getString("url") ?? undefined;
    int.client.user.setActivity({ name, type, url });
    return int.editReply(`Status set to ${t ?? ""} ${name}`);
  }
  return int.editReply("Status updated!");
}

const Module = new Augur.Module()
.addInteraction({ name: "bot",
  id: u.sf.commands.slashBot,
  onlyGuild: true,
  hidden: true,
  permissions: (int) => u.perms.calc(int.member, ["botTeam", "botAdmin"]),
  process: async (int) => {
    if (!u.perms.calc(int.member, ["botTeam", "botAdmin"])) return; // redundant check, but just in case lol
    const subcommand = int.options.getSubcommand(true);
    const forThePing = await int.deferReply({ ephemeral: int.channelId !== "789694239197626371" });
    if (["gotobed", "reload", "register", "status"].includes(subcommand) && !u.perms.isAdmin(int.member)) return int.editReply("That command is only for Bot Admins.");
    if (subcommand === "pull" && !u.perms.isOwner(int.member)) return int.editReply("That command is only for the Bot Owner.");
    switch (subcommand) {
      case "gotobed": return slashBotGtb(int);
      case "ping": return slashBotPing(int, forThePing);
      case "pull": return slashBotPull(int);
      case "pulse": return slashBotPulse(int);
      case "reload": return slashBotReload(int);
      case "getid": return slashBotGetId(int);
      case "register": return slashBotRegister(int);
      case "status": return slashBotStatus(int);
      default: return u.errorHandler(new Error("Unhandled Subcommand"), int);
    }
  },
  autocomplete: (int) => {
    const option = int.options.getFocused();
    const files = fs.readdirSync(path.resolve(__dirname)).filter(file => file.endsWith(".js"));
    int.respond(files.filter(file => file.includes(option)).slice(0, 24).map(f => ({ name: f, value: f })));
  }
});

module.exports = Module;

