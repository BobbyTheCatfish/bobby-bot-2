// @ts-check

const Augur = require("augurbot-ts");
const u = require("../utils/utils");

/** @param {Augur.GuildInteraction<"CommandSlash">} int*/
async function slashWelcome(int) {
  // get resources
  const channel = int.options.getChannel('channel');
  await int.deferReply({ flags: ["Ephemeral"] });
  if (channel && !channel.isSendable()) return int.editReply("I can't send messages to that channel. Try another one!");
  // update
  await u.db.configs.update(int.guildId, { welcomeChannel: channel?.id ?? null });
  return int.editReply(channel ? `Your welcome message channel has been updated to ${channel}.` : "Welcome messages are now disabled.");
}

/** @param {Augur.GuildInteraction<"CommandSlash">} int*/
async function slashLogs(int) {
  // get resources
  const channel = int.options.getChannel('logs-channel');
  const filterStatus = int.options.getBoolean("chat-filters");
  await int.deferReply({ flags: ["Ephemeral"] });
  if (channel && !channel.isSendable()) return int.editReply("I can't send messages to that channel. Try another one!");

  // save
  /** @type {{ modLogs?: string | null, filter?: boolean }} */
  await u.db.configs.update(int.guildId, {
    modLogs: channel?.id ?? null,
    filter: filterStatus ?? undefined
  });
  return int.editReply(`Your moderation settings have been updated.`);
}

const Module = new Augur.Module()
  .addInteraction({
    id: u.sf.commands.slashConfig,
    userPermissions: ["ManageGuild"],
    onlyGuild: true,
    process: async (int) => {
      switch (int.options.getSubcommand(true)) {
        case "welcome": return slashWelcome(int);
        case "moderation": return slashLogs(int);
        default: return u.errorHandler(new Error("Unhandled subcommand"), int);
      }
    }
  });

module.exports = Module;