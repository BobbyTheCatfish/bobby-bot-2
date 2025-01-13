// @ts-check
const Augur = require("augurbot-ts"),
  u = require("../utils/utils");

const embedColors = {
  action: 0xff0000,
  handled: 0x0000ff,
  info: 0x00ffff,
  success: 0x00ff00
};

const Module = new Augur.Module()
.addEvent("guildBanAdd", async (guildBan) => {
  const guild = guildBan.guild;
  const user = guildBan.user;
  const config = await u.db.configs.get(guild.id);
  const modLogs = guild.channels.cache.get(config?.modLogs ?? "");
  if (modLogs && modLogs.isSendable()) {
    const embed = u.embed({ author: user })
      .setTitle(`${user.username} has been banned`)
      .setDescription(user.toString())
      .setColor(embedColors.info)
      .setFooter({ text: user.id });

    modLogs.send({ embeds: [embed] });
  }
})

.addEvent("guildMemberAdd", async (member) => {
  try {
    // see if they opted in to logs
    const config = await u.db.configs.get(member.guild.id);
    const modLogs = member.guild.channels.cache.get(config?.modLogs ?? "");
    if (!modLogs || !modLogs.isSendable()) return;

    // send a notification to modlogs
    const embed = u.embed({ author: member })
      .setTitle(`${member.displayName} joined the server`)
      .setColor(embedColors.info)
      .addFields(
        { name: "User", value: member.toString(), inline: true },
        { name: "Account Created", value: member.user.createdAt.toLocaleDateString(), inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL({ extension: "png" }))
      .setFooter({ text: member.id });

    modLogs.send({ embeds: [embed] });
  } catch (e) { u.errorHandler(e, "New Member Add"); }
})
.addEvent("guildMemberRemove", async (member) => {
  try {
    // see if they opted in to logs
    const config = await u.db.configs.get(member.guild.id);
    const modLogs = member.guild.channels.cache.get(config?.modLogs ?? "");
    if (!modLogs || !modLogs.isSendable()) return;

    if (member.partial) member = await member.fetch().catch(() => member);
    if (member.partial) return; // failed to fetch

    // send a notification to modlogs
    const embed = u.embed({ author: member })
      .setTitle(`${member.displayName} has left the server`)
      .setColor(embedColors.info)
      .setFields(
        { name: "User", value: member.toString() },
        { name: "Joined", value: u.moment(member.joinedAt).fromNow(), inline: true }
      )
      .setThumbnail(member.displayAvatarURL({ extension: "png" }))
      .setFooter({ text: member.id });
    modLogs.send({ embeds: [embed], });
  } catch (error) { u.errorHandler(error, `Member Leave: ${u.escapeText(member.displayName)} (${member.id})`); }
});


module.exports = Module;
