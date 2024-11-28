const express = require('express');
const upload = require('../config/multer');
const pdfController = require('../controllers/pdfController');

const router = express.Router();

// Организация PDF
router.post('/merge', upload.array('files'), pdfController.merge);
router.post('/split', upload.single('file'), pdfController.split);
router.post('/remove-pages', upload.single('file'), pdfController.removePages);
router.post('/extract-images', upload.single('file'), pdfController.extractImages);
router.post('/reorganize', upload.single('file'), pdfController.reorganize);

// Конвертация
router.post('/jpg-to-pdf', upload.array('files'), pdfController.convertFromJpg);
router.post('/word-to-pdf', upload.single('file'), pdfController.convertFromWord);

// Оптимизация
router.post('/compress', upload.single('file'), pdfController.compress);

// Редактирование
router.post('/rotate', upload.single('file'), pdfController.rotate);
router.post('/add-watermark', upload.single('file'), pdfController.addWatermark);

// Скачивание результата
router.get('/download/:sessionId/:index', async (req, res) => {
  const { sessionId, index } = req.params;
  const files = processedFiles.get(sessionId);
  
  if (!files || !files[index]) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const file = files[index];
  res.download(file.path, file.name);
});

module.exports = router;