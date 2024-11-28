const express = require('express');
const cors = require('cors');
const fs = require('fs');
const pdfRoutes = require('./routes/pdfRoutes');

const app = express();
const port = 3008;

// Создаем необходимые директории
['./temp', './uploads'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

app.use(cors());
app.use(express.json());
app.use('/api/pdf', pdfRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
