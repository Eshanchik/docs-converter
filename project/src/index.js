const express = require('express');
const cors = require('cors');
const { ensureDirectoryExists } = require('./utils/fileHelpers');
const pdfRoutes = require('./routes/pdfRoutes');

const app = express();
const port = process.env.PORT || 3008;
// Создаем необходимые директории
(async () => {
    await ensureDirectoryExists('temp');
    await ensureDirectoryExists('uploads');
  })();
  
  app.use(cors());
  app.use(express.json());
  app.use('/api/pdf', pdfRoutes);
  
  // Обработка ошибок
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      error: err.message || 'Something went wrong!'
    });
  });
  
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
