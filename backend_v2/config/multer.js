const multer = require('multer');
const path = require('path');
const { sanitizeFileName } = require('../utils/fileHelpers');

const storage = multer.diskStorage({
  destination: 'temp/',
  filename: (req, file, cb) => {
    // Очищаем имя файла от проблемных символов
    const cleanFileName = sanitizeFileName(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${cleanFileName}`);
  }
});

// Добавляем фильтр файлов
const fileFilter = (req, file, cb) => {
  // Проверяем тип файла
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Ограничиваем размер файла 10MB
  }
});

module.exports = upload;
