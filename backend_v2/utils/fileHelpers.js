// src/utils/fileHelpers.js
// Вспомогательные функции для работы с файлами
const fs = require('fs/promises');

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

const sanitizeFileName = (fileName) => {
    // Декодируем URI-encoded строку
    try {
      return decodeURIComponent(fileName).replace(/[^\w\s\-\.]/g, '_');
    } catch (e) {
      // Если декодирование не удалось, просто очищаем от непечатных символов
      return fileName.replace(/[^\w\s\-\.]/g, '_');
    }
  };

module.exports = {
  processedFiles,
  cleanupFiles,
  setupAutoCleanup
};