// @ts-check
const Discord = require("discord.js");
const { AxiosError } = require("axios");
const config = { ...require("../config/config.json"), ...require("../config/startup.json") };

const errorLog = new Discord.WebhookClient({ url: config.webhooks.error });

/**
 * @typedef ParsedInteraction
 * @property {String | null} command - The command issued, represented as a string.
 * @property {{name: string, value: string|number|boolean|undefined}[]} data - Associated data for the command, such as command options or values selected.
 */

/**
 * Converts an interaction into a more universal format for error messages.
 * @param {Discord.BaseInteraction} int The interaction to be parsed.
 * @returns {ParsedInteraction} The interaction after it has been broken down.
 */
function parseInteraction(int) {
  if (int.isCommand() || int.isAutocomplete()) {
    let command = "";
    /** @type {(Record<any, any> & {name: string, value?: string | number | boolean})[]} */
    let data = [];
    if (int.isAutocomplete()) command += "Autocomplete for ";
    if (int.isChatInputCommand()) {
      command += `/${int.commandName}`;
      const sg = int.options.getSubcommandGroup(false);
      const sc = int.options.getSubcommand(false);
      if (sg) {
        command += ` ${sg}`;
        data = Array.from(int.options.data[0]?.options?.[0]?.options ?? []);
      }
      if (sc) command += ` ${sc}`;
    } else {
      command = int.commandName;
      data = [...int.options.data];
    }
    return {
      command,
      data: data.map(a => ({ name: a.name, value: a.value }))
    };
  } else if (int.isMessageComponent()) {
    const data = [
      {
        name: "Type",
        value: Discord.ComponentType[int.componentType]
      }
    ];
    if (int.isAnySelectMenu()) {
      data.push({
        name: "Value(s)",
        value: int.values.join(', ')
      });
    }
    return { command: int.customId, data };
  } else if (int.isModalSubmit()) {
    return {
      command: `Modal ${int.customId}`,
      data: int.fields.fields.map(f => ({ name: f.data.label, value: f.value }))
    };
  }
  return { command: null, data: [] };
}

/**
 * After the given amount of time, attempts to delete the message.
 * @param {Discord.Message|Discord.APIMessage|Discord.Interaction|Discord.InteractionResponse|null|void} [msg] The message to delete.
 * @param {number} t The length of time to wait before deletion, in milliseconds.
 */
async function clean(msg, t = 20000) {
  if (!msg) return;
  // delay
  await new Promise((res) => {
    setTimeout(res, t);
  });
  if (msg instanceof Discord.BaseInteraction) {
    if (msg.isRepliable()) msg.deleteReply().catch(noop);
  } else if ((msg instanceof Discord.Message) && msg.deletable) {
    msg.delete().catch(noop);
  } else if (msg instanceof Discord.InteractionResponse) {
    msg.delete().catch(noop);
  }
}

async function noop() {
  return;
}

/**
 * Handles a command exception/error. Most likely called from a catch.
 * Reports the error and lets the user know.
 * @param {Error | null} [error] The error to report.
 * @param {Discord.Message|Discord.BaseInteraction|string|null} message Any Discord.Message, Discord.BaseInteraction, or text string.
 */
function errorHandler(error, message = null) {
  if (!error || (error.name === "AbortError")) return;
  /* eslint-disable-next-line no-console*/
  console.error(Date());

  const errEmbed = new Discord.EmbedBuilder().setTitle(error?.name?.toString() ?? "Error");

  if (message instanceof Discord.Message) {
    const loc = (message.inGuild() ? `${message.guild?.name} > ${message.channel?.name}` : "DM");
    /* eslint-disable-next-line no-console*/
    console.error(`${message.author.username} in ${loc}: ${message.cleanContent}`);
    message.reply("I've run into an error. I've let my devs know.").then(clean);

    errEmbed.addFields(
      { name: "User", value: message.author.username, inline: true },
      { name: "Location", value: loc, inline: true },
      { name: "Command", value: message.cleanContent || "`undefined`", inline: true }
    );
  } else if (message instanceof Discord.BaseInteraction) {
    const loc = (message.inGuild() ? `${message.guild?.name ?? "Unknown Server"} > ${message.channel?.name ?? "Unknown Channel"}` : "DM");
    /* eslint-disable-next-line no-console*/
    console.error(`Interaction by ${message.user.username} in ${loc}`);
    if (message.isRepliable() && (message.deferred || message.replied)) message.editReply("I've run into an error. I've let my devs know.").catch(noop).then(clean);
    else if (message.isRepliable()) message.reply({ content: "I've run into an error. I've let my devs know.", flags: ["Ephemeral"] }).catch(noop).then(clean);

    errEmbed.addFields(
      { name: "User", value: message.user?.username, inline: true },
      { name: "Location", value: loc, inline: true }
    );

    const descriptionLines = [];
    const { command, data } = parseInteraction(message);
    if (command) descriptionLines.push(command);
    for (const datum of data) {
      descriptionLines.push(`${datum.name}: ${datum.value}`);
    }
    errEmbed.addFields({ name: "Interaction", value: descriptionLines.join("\n") });
  } else if (typeof message === "string") {
    /* eslint-disable-next-line no-console*/
    console.error(message);
    errEmbed.addFields({ name: "Message", value: message });
  }

  if (error instanceof AxiosError) {
    /* eslint-disable-next-line no-console*/
    console.trace({ name: error.name, code: error.code, message: error.message, cause: error.cause });
  } else {
    /* eslint-disable-next-line no-console*/
    console.trace(error);
  }


  let stack = (error.stack ? error.stack : error.toString());
  if (stack.length > 4096) stack = stack.slice(0, 4000);

  errEmbed.setDescription(stack);
  return errorLog.send({ embeds: [errEmbed] });
}

/**
 * @template T
 * @param {T[]} input
 * @returns {T}
 */
function rand(input) {
  return input[Math.floor(Math.random() * input.length)];
}

/**
   * Returns a MessageEmbed with basic values preset, such as color and timestamp.
   * @param {{author?: Discord.GuildMember|Discord.User|Discord.APIEmbedAuthor|Discord.EmbedAuthorData|null} & Omit<(Discord.Embed | Discord.APIEmbed | Discord.EmbedData), "author">} [data] The data object to pass to the MessageEmbed constructor.
   *   You can override the color and timestamp here as well.
   */
function embed(data = {}) {
  const newData = JSON.parse(JSON.stringify(data));
  if (data?.author instanceof Discord.GuildMember || data?.author instanceof Discord.User) {
    newData.author = {
      name: data.author.displayName,
      iconURL: data.author.displayAvatarURL()
    };
  }
  const newEmbed = new Discord.EmbedBuilder(newData);
  if (!data?.color) newEmbed.setColor(parseInt(config.color));
  if (!data?.timestamp) newEmbed.setTimestamp();
  return newEmbed;
}

module.exports = {
  errorHandler,
  clean,
  noop,
  embed,
  rand,
  config,
  db: require("../database/dbControllers"),
  sf: require("../config/snowflakes.json")
};