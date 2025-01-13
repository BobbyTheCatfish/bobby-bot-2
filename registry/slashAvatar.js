// @ts-check
const u = require("./regUtils");

const user = new u.user()
  .setName("user")
  .setDescription("The user whose avatar to see")
  .setRequired(false);

const image = new u.attachment()
  .setName("image")
  .setDescription("An image to apply the filter to")
  .setRequired(false);

const filter = new u.string()
  .setName("filter")
  .setDescription("Apply a filter to the image")
  .setRequired(false)
  .setChoices(
    { name: "Among Us", value: "amongus" },
    { name: "Blur", value: "blur" },
    { name: "Blurple", value: "blurple" },
    { name: "Deepfry", value: "deepfry" },
    { name: "Fish Eye", value: "fisheye" },
    { name: "Flex", value: "flex" },
    { name: "Invert", value: "invert" },
    { name: "Metal", value: "metal" },
    { name: "Personal", value: "personal" },
    { name: "Spin", value: "spin" }
  );

module.exports = new u.cmd()
  .setName("avatar")
  .setDescription("See someone's avatar or apply a filter")
  .addUserOption(user)
  .addAttachmentOption(image)
  .addStringOption(filter)
  .setContexts(u.context.BotDM, u.context.Guild, u.context.PrivateChannel);