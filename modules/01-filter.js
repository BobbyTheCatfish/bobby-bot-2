// @ts-check
const Augur = require("augurbot-ts"),
  banned = require("../data/banned.json"),
  Discord = require("discord.js"),
  profanityFilter = require("profanity-matcher"),
  u = require("../utils/utils");


const bannedWords = new RegExp(banned.words.join("|"), "i"),
  hasLink = /(>?(>?http[s]?|ftp):\/\/)([\w.-]+\.)?([\w.-]+\.[^/\n ]+)(\/[^ \n]+)?/gi;

let pf = new profanityFilter();

/**
 * Filter some text, warn if appropriate.
 * @param {String} text The text to scan.
 */
function filter(text) {
  // PROFANITY FILTER
  const noWhiteSpace = text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~"'()?|]/g, "").replace(/\s\s+/g, " ");
  const filtered = pf.scan(noWhiteSpace);
  if ((filtered.length > 0) && filtered[0] && (noWhiteSpace.length > 0)) return filtered;
  return [];
}

/**
 * Process discord message language
 * @param {Discord.Message} msg Message
 */
async function processMessageLanguage(msg) {
  if (!msg.member || !msg.inGuild()) return;
  const config = await u.db.configs.get(msg.guildId);
  const modLogs = msg.guild.channels.cache.get(config?.modLogs ?? "");
  if (!config?.filter || !modLogs?.isSendable() || msg.channelId === modLogs.id) return;

  /** @type {string[]} */
  const matchedContent = [];
  /** @type {string[]} */
  const reasons = [];
  let warned = false;
  let pingMods = false;

  /** @param {{tld: string | undefined, url: string}} l */
  const linkMap = (l) => (l.tld ?? "") + l.url;

  /** @param {string} prop @param {{tld: string | undefined, url: string}} l */
  const linkFilter = (prop, l) => new RegExp(banned[prop].join('|'), 'gi').test(linkMap(l));


  // LINK FILTER
  let link = null;
  /** @type {Discord.Collection<string, {tld: string | undefined, url: string}>} */
  const matchedLinks = new u.Collection();
  let matchedWords = null;
  let gif = false;
  while ((link = hasLink.exec(msg.cleanContent)) !== null) {
    matchedLinks.set((link[3] ?? "") + link[4], { tld: link[3], url: link[4] });
  }
  if (matchedLinks.size > 0) {
    const bannedLinks = matchedLinks.filter(l => linkFilter("links", l)).map(linkMap);
    const scamLinks = matchedLinks.filter(l => linkFilter("scam", l)).filter(l => !linkFilter("exception", l)).map(linkMap);
    // Naughty Links
    if (bannedLinks.length > 0) {
      matchedContent.push(...bannedLinks);
      reasons.push("Dangerous Link");
    } else if (scamLinks.length > 0) {
      // Scam Links
      u.clean(msg, 0);
      if (!warned) msg.reply({ content: "That link is generally believed to be a scam/phishing site. Please be careful!", failIfNotExists: false }).catch(u.noop);
      warned = true;
      matchedContent.push(...scamLinks);
      reasons.push("Suspected Scam Links (Auto-Removed)");
    } else if (bannedWords.exec(msg.cleanContent) && matchedLinks.find(l => l.url.includes("tenor") || l.url.includes("giphy"))) {
      // Bad gif link
      u.clean(msg, 0);
      if (!warned) msg.reply({ content: "Looks like that link might have some harsh language. Please be careful!", failIfNotExists: false }).catch(u.noop);
      warned = true;
      gif = true;
      matchedContent.push(...matchedLinks.map(linkMap), ...(bannedWords.exec(msg.cleanContent) || []));
      reasons.push("Gif Link Language (Auto-Removed)");
    }
  }

  // HARD LANGUAGE FILTER
  if ((matchedWords = msg.cleanContent.match(bannedWords)) && !gif) {
    matchedContent.push(...matchedWords);
    reasons.push("Harsh Profanity Detected");
    pingMods = true;
  }

  // SOFT LANGUAGE FILTER
  const soft = filter(msg.cleanContent);
  if (soft.length > 0) {
    matchedContent.push(...soft);
    reasons.push("Profanity Detected");
  }

  // LINK PREVIEW FILTER
  if (msg.author.id !== msg.client.user.id) {
    for (const embed of msg.embeds) {
      const preview = [embed.author?.name ?? "", embed.title ?? "", embed.description ?? ""].join("\n").toLowerCase();
      const previewBad = preview.match(bannedWords) ?? [];
      if (previewBad.length > 0) {
        u.clean(msg, 0);
        if (!warned && !msg.author.bot && !msg.webhookId) msg.reply({ content: "It looks like that link might have some harsh language in the preview. Please be careful!", failIfNotExists: false }).catch(u.noop);
        warned = true;
        matchedContent.push(...previewBad);
        reasons.push("Link Preview Language (Auto-Removed)");
      }
      if (filter(preview).length > 0) {
        if (!warned && !msg.author.bot && !msg.webhookId) msg.reply({ content: "It looks like that link might have some language in the preview. Please be careful!", failIfNotExists: false }).catch(u.noop);
        warned = true;
        msg.suppressEmbeds().catch(u.noop);
        break;
      }
    }
  }
  if (matchedContent.length > 0) {
    msg.content = msg.cleanContent.replace(new RegExp(matchedContent.join("|"), "gi"), (str) => `**${str}**`).replace(/https?(:\/\/)/g, "");
    const flag = u.embed({ author: msg.member })
      .setColor("Green")
      .setTimestamp(msg.editedAt ?? msg.createdAt)
      .setDescription(msg.editedAt ? "[Edited]\n" : "" + msg.cleanContent)
      .addFields(
        { name: "Matched", value: matchedContent.join("\n") },
        { name: "Channel", value: msg.channel.name, inline: true },
        { name: "Jump to Post", value: msg.url, inline: true },
        { name: "User", value: `${msg.member} (${msg.member.displayName})` }
      );
    /** @type {string[]} */
    const content = [];
    if (pingMods) {
      u.clean(msg, 0);
      msg.reply("Watch your profamity").then(m => u.clean(m, 10_000));
      msg.member.timeout(10_000, "Harsh Profanity");
      content.push("The message has been deleted.");
      if (msg.author.bot || msg.webhookId) content.push("Keep in mind that this was done by a bot and likely originated elsewhere.");
    }
    modLogs.send({ embeds: [flag], content: content.join("\n") });
  }
}

/********************
**  Filter Events  **
********************/
const Module = new Augur.Module()
.addEvent("messageCreate", processMessageLanguage)
.addEvent("messageEdit", async (old, newMsg) => {
  processMessageLanguage(newMsg);
})
// @ts-ignore it does exist
.addEvent("filterUpdate", () => pf = new profanityFilter());


module.exports = Module;
