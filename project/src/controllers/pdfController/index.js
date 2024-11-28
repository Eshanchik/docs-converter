const merge = require('./merge');
const split = require('./split');
const removePages = require('./removePages');
const extractImages = require('./extractImages');
const reorganize = require('./reorganize');
const convertFromJpg = require('./convertFromJpg');
const convertFromWord = require('./convertFromWord');
const compress = require('./compress');
const rotate = require('./rotate');
const addWatermark = require('./addWatermark');

module.exports = {
  merge,
  split,
  removePages,
  extractImages,
  reorganize,
  convertFromJpg,
  convertFromWord,
  compress,
  rotate,
  addWatermark
};