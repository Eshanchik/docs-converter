const express = require('express');
const upload = require('../config/multer');
const debug = require('../utils/debugUtils')('PDFRoutes');
const { processedFiles } = require('../utils/fileHelpers');
const {
    mergePDFs,
    splitPDF,
    removePages,
    extractImages,
    reorganizePages,
    scanToPDF
} = require('../controllers/pdfController');

const router = express.Router();

router.post('/merge', upload.array('files'), mergePDFs);
router.post('/split', upload.single('file'), splitPDF);
router.post('/remove-pages', upload.single('file'), express.json(), async (req, res) => {
    debug('Received remove-pages request', {
      contentType: req.headers['content-type'],
      body: req.body,
      file: req.file ? {
        filename: req.file.originalname,
        cleanFilename: sanitizeFileName(req.file.originalname),
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });
  
    // Проверяем, что файл загружен
    if (!req.file) {
      debug('No file received');
      return res.status(400).json({ error: 'No PDF file provided' });
    }
  
    // Проверяем наличие pages в body
    if (!req.body.pages) {
      debug('No pages specified in form data');
      return res.status(400).json({ error: 'Pages array is required' });
    }
  
    try {
      await removePages(req, res);
    } catch (error) {
      debug('Error in route handler', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });
router.post('/extract-images', upload.single('file'), extractImages);
router.post('/reorganize', upload.single('file'), reorganizePages);
router.post('/scan', scanToPDF);

router.get('/download/:sessionId/:index', async (req, res) => {
  const { sessionId, index } = req.params;
  const files = processedFiles.get(sessionId);
  
  if (!files || !files[index]) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const file = files[index];
  res.download(file.path, file.name);
});

// ... остальные маршруты

module.exports = router;
