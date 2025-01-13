// @ts-check
const config = require("../config/startup.json"),
  mongoose = require("mongoose");

const configs = require("./controllers/GuildConfig");


mongoose.connect(config.db.db);

module.exports = {
  configs
};