// @ts-check
const Config = require("../models/GuildConfig");

/**
 * @typedef GuildConfig
 * @prop {string} guildId
 * @prop {string | null} [welcomeChannel]
 * @prop {string | null} [modLogs]
 * @prop {boolean} [filter]
 */

/**
 * @param {string} guildId
 * @returns {Promise<GuildConfig|null>}
 */
function get(guildId) {
  return Config.findOne({ guildId }, undefined, { new: true, upsert: true, lean: true }).exec();
}

/**
 * @param {string} guildId
 * @param {{ welcomeChannel?: string | null, modLogs?: string | null, filter?: boolean }} updateObject
 * @returns {Promise<GuildConfig|null>}
 */
function update(guildId, updateObject) {
  return Config.findOneAndUpdate({ guildId }, updateObject, { new: true, upsert: true, lean: true }).exec();
}

module.exports = {
  get,
  update
};