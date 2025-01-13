// @ts-check
const Augur = require("augurbot-ts");
const { Partials } = require("discord.js");
const config = require("./config/startup.json");
const u = require("./utils/utils");

// @ts-expect-error can't turn events into a keyof array
const client = new Augur.AugurClient(config, {
    commands: "./modules",
    errorHandler: u.errorHandler,
    clientOptions: {
        allowedMentions: {
            parse: [],
            repliedUser: true
        },
        partials: [Partials.Channel, Partials.Message, Partials.Reaction]
    }
})

client.login();

// LAST DITCH ERROR HANDLING
process.on("unhandledRejection", (error, p) => p.catch(e => u.errorHandler(e, "Unhandled Rejection")));
process.on("uncaughtException", (error) => u.errorHandler(error, "Uncaught Exception"));

module.exports = client;
