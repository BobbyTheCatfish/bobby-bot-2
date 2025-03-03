// @ts-check
const Augur = require("augurbot-ts");
const Twitch = require("@twurple/api");
const TwitchAuth = require("@twurple/auth").AppTokenAuthProvider;
const config = require("../config/config.json");
const { youtube } = require("@googleapis/youtube");

const yt = youtube({
  version: "v3",
  auth: config.api.youtube
});

const twitch = new Twitch.ApiClient({ authProvider: new TwitchAuth(config.api.twitch.clientId, config.api.twitch.accessToken) });

const uploadsChannel = "425609935309504513";

const Module = new Augur.Module();


async function checkStats() {
  const ytChannel = await yt.channels.list({ forHandle: "@bobbythecatfish", part: ["statistics"] });
  const subs = ytChannel?.data?.items?.[0].statistics?.subscriberCount || 0;

  const followers = await twitch.channels.getChannelFollowerCount("181156089") || 0;
  const uploads = Module.client.channels.cache.get(uploadsChannel);
  if (!uploads?.isTextBased() || !uploads.isSendable() || uploads.isVoiceBased() || uploads.isThread() || uploads.isDMBased()) return;
  uploads.setTopic(`Tune in to my latest content! | Subs: ${subs} | Twitch: ${followers}`);
}


Module.setClockwork(() => {
  return setInterval(async () => {
    checkStats();
  }, 24 * 60 * 60_000);
})
.setInit(() => {
  checkStats();
});


module.exports = Module;