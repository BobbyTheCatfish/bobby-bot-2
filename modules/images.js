// @ts-check
const Augur = require('augurbot-ts'),
  u = require('../utils/utils'),
  Jimp = require('jimp'),
  Discord = require('discord.js'),
  { ColorActionName } = require("@jimp/plugin-color"),
  { GifFrame, GifUtil, GifCodec, BitmapImage } = require('gifwrap');

/**
 * @callback filterFunction
 * @param {Discord.ChatInputCommandInteraction} int
 * @param {Jimp} img
 *
 * @callback process
 * @param {number} x
 * @param {number} y
 * @param {Jimp} canvas
 * @param {number} index
 */

const readError = 'I ran into an error while getting the image. It might be too large.';

const Module = new Augur.Module();

/**
 * Get the image from an interaction.
 * @param {Discord.ChatInputCommandInteraction} int
 * @param {Discord.ImageSize} size size of the image
 * @returns {Promise<Jimp|null>} image url
 */
async function targetImg(int, size = 256) {
  const file = int.options.getAttachment("file")?.url;
  if (file) {
    const img = await Jimp.read(file).catch(u.noop);
    if (!img) return null;
    return img;
  }
  let target;
  if (int.inCachedGuild()) target = int.options.getMember("user") ?? int.member;
  else target = int.options.getUser("user") ?? int.user;

  return Jimp.read(target.displayAvatarURL({ extension: 'png', size, forceStatic: true }));
}

/**
 * @param {Discord.ChatInputCommandInteraction} int
 * @param {Buffer | string} img
 */
async function sendImg(int, img, format = "png") {
  const attachment = new Discord.AttachmentBuilder(img, { name: `image.${format}` });
  return int.editReply({ files: [attachment] });
}

/**
 * Apply a filter function with parameters. Useful for when there isn't much logic to it
 * @param {Discord.ChatInputCommandInteraction} int
 * @param {Jimp} img
 * @param {string} filter filter to apply
 * @param {any[]} [params] array of params to pass into the filter function
 */
async function basicFilter(int, img, filter, params) {
  if (params) img[filter](...params);
  else img[filter]();
  const output = await img.getBufferAsync(Jimp.MIME_PNG);
  return sendImg(int, output);
}

/** @type {filterFunction} */
async function amongus(int, img) {
  const color = u.rand(['black', 'blue', 'brown', 'cyan', 'green', 'lime', 'orange', 'pink', 'purple', 'red', 'white', 'yellow', 'maroon', 'rose', 'banana', 'gray', 'tan', 'coral']);
  const base = await Jimp.read(`media/amongians/${color}.png`);
  const mask = await Jimp.read('media/amongians/mask.png');
  const helmet = await Jimp.read('media/amongians/helmet.png');
  img = base.clone().blit(img.resize(370, Jimp.AUTO), 375, 130).mask(mask, 0, 0);
  const output = await base.blit(img, 0, 0)
    .blit(helmet, 0, 0)
    .getBufferAsync(Jimp.MIME_PNG);
  return sendImg(int, output);
}

/** @type {filterFunction} */
async function spin(int, img) {
  let i = 0;
  const deg = 30;
  const gifFrames = [];
  const scale = Math.min(img.getHeight(), img.getWidth());
  img.crop(0, 0, scale, scale).circle();
  do {
    const newImage = img.clone().rotate((0 - deg) * i).autocrop();
    const frame = new GifFrame(new BitmapImage(newImage.bitmap), { delayCentisecs: 3 });
    GifUtil.quantizeSorokin(frame, 250);
    gifFrames.push(frame);
    i++;
  } while (i < (360 / deg));
  const result = await GifCodec.prototype.encodeGif(gifFrames, { loops: 0 });
  return sendImg(int, result.buffer, "gif");
}

/** @type {filterFunction} */
async function deepfry(int, img) {
  const output = await img.posterize(20)
    .color([{ apply: ColorActionName.SATURATE, params: [100] }])
    .contrast(1)
    .getBufferAsync(Jimp.MIME_PNG);
  return sendImg(int, output);
}

/**
 * @param {Discord.ChatInputCommandInteraction} int
 * @param {Jimp} img
 * @param {string} hand
 * @param {boolean} doFlips
 */
async function handStuff(int, img, hand, doFlips = false) {
  const right = await Jimp.read(hand);
  const left = right.clone().flip(true, doFlips ? Math.random() > 0.5 : false);
  const canvas = new Jimp(368, 128, 0x00000000);
  if (doFlips) right.flip(false, Math.random() > 0.5);
  if (!img.hasAlpha()) img.circle();
  img.resize(128, 128);
  const output = await canvas.blit(left, 0, 4)
    .blit(right, 248, 4)
    .blit(img, 120, 0)
    .getBufferAsync(Jimp.MIME_PNG);
  return sendImg(int, output);
}

/** @type {filterFunction} */
async function flex(int, img) {
  return handStuff(int, img, "media/flexArm.png", true);
}

/** @type {filterFunction} */
async function metal(int, img) {
  return handStuff(int, img, 'media/metalHand.png');
}

/** @type {filterFunction} */
async function personal(int, img) {
  const canvas = await Jimp.read('media/personalBase.png');
  img.resize(350, 350);
  if (!img.hasAlpha()) img.circle();
  const output = await canvas.blit(img, 1050, 75).getBufferAsync(Jimp.MIME_PNG);
  return sendImg(int, output);
}

/** @param {Discord.ChatInputCommandInteraction} int */
async function avatar(int) {
  let targetUser;
  if (int.inCachedGuild()) targetUser = int.options.getMember("user") ?? int.member;
  else targetUser = int.options.getUser("user") ?? int.user;
  const targetImage = targetUser.displayAvatarURL({ size: 512, forceStatic: false });
  const format = targetImage.includes('.gif') ? 'gif' : 'png';
  return sendImg(int, targetImage, format);
}

Module
.addInteraction({ name: "avatar",
  id: u.sf.commands.slashAvatar,
  process: async (interaction) => {
    const file = interaction.options.getAttachment('file');
    const filter = interaction.options.getString("filter");
    if (file && !filter) return interaction.reply({ content: "You need to specify a filter to apply if you're uploading a file", ephemeral: true });
    if (file && file.size > 4000000) return interaction.reply({ content: "That file is too big for me to process! It needs to be under 4MB.", ephemeral: true });
    await interaction.deferReply();

    if (!filter) return avatar(interaction);
    const img = await targetImg(interaction);
    if (!img) return interaction.editReply({ content: readError }).then(u.clean);
    switch (filter) {
      case "amongus": return amongus(interaction, img);
      case "deepfry": return deepfry(interaction, img);
      case "flex": return flex(interaction, img);
      case "metal": return metal(interaction, img);
      case "personal": return personal(interaction, img);
      case "spin": return spin(interaction, img);

      // basic filters
      case "fisheye": return basicFilter(interaction, img, 'fisheye');
      case "invert": return basicFilter(interaction, img, 'invert');
      case "blur": return basicFilter(interaction, img, 'blur', [5]);
      case "blurple": return basicFilter(interaction, img, 'color', [[{ apply: "desaturate", params: [100] }, { apply: "saturate", params: [47.7] }, { apply: "hue", params: [227] }]]);
      default: return;
    }
  }
});
Module.addCommand({ name: "crop",
  category: "Images",
  process: async (msg) => {
    const message = msg.channel.messages.cache.filter(m => m.attachments?.size > 0).sort((a, b) => a.createdTimestamp - b.createdTimestamp).last();
    const attachment = message?.attachments.first();
    if (!attachment) return msg.react("😰");
    const image = await Jimp.read(attachment.url);
    if (!image) return msg.reply(readError);
    image.autocrop({ cropOnlyFrames: false, cropSymmetric: false, tolerance: 0.01 });
    const output = await image.getBufferAsync(Jimp.MIME_PNG);
    return msg.reply({ files: [output] });
  }
});

module.exports = Module;