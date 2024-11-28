const fs = require('fs/promises');
const path = require('path');

const processedFiles = new Map();

const cleanupFiles = async (files) => {
  if (Array.isArray(files)) {
    await Promise.all(files.map(file => fs.unlink(file.path).catch(() => {})));
  } else if (files?.path) {
    await fs.unlink(files.path).catch(() => {});
  }
};

const setupAutoCleanup = (sessionId, files, timeout = 3600000) => {
  setTimeout(() => {
    if (processedFiles.has(sessionId)) {
      files.forEach(file => fs.unlink(file.path).catch(() => {}));
      processedFiles.delete(sessionId);
    }
  }, timeout);
};

const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

module.exports = {
  processedFiles,
  cleanupFiles,
  setupAutoCleanup,
  ensureDirectoryExists
};