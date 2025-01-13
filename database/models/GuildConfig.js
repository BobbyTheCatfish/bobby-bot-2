const mongoose = require("mongoose");

const GuildConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  welcomeChannel: {
    type: String
  },
  modLogs: {
    type: String
  },
  filter: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("GuildConfig", GuildConfigSchema);