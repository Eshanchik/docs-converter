// src/controllers/pdfController.js
// Логика обработки PDF файлов
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');
const libre = require('libreoffice-convert');
const { promisify } = require('util');
const { processedFiles, cleanupFiles, setupAutoCleanup } = require('../utils/fileHelpers');
const { degrees } = require('../utils/pdfHelpers');

const libreConvert = promisify(libre.convert);

const mergePDFs = async (req, res) => {
  try {
    const mergedPdf = await PDFDocument.create();
    for (const file of req.files) {
      const pdfBytes = await fs.readFile(file.path);
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }
    
    const pdfBytes = await mergedPdf.save();
    const fileName = `merged-${Date.now()}.pdf`;
    const filePath = path.join('temp', fileName);
    await fs.writeFile(filePath, Buffer.from(pdfBytes));
    
    const sessionId = Date.now().toString();
    const files = [{ path: filePath, name: fileName }];
    processedFiles.set(sessionId, files);
    
    setupAutoCleanup(sessionId, files);
    res.json({ sessionId, count: 1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await cleanupFiles(req.files);
  }
};

const splitPDF = async (req, res) => {
  try {
    const pdfBytes = await fs.readFile(req.file.path);
    const pdf = await PDFDocument.load(pdfBytes);
    const files = [];
    
    for (let i = 0; i < pdf.getPageCount(); i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdf, [i]);
      newPdf.addPage(page);
      const pageBytes = await newPdf.save();
      const filename = `page-${i + 1}.pdf`;
      const filepath = path.join('temp', `${Date.now()}-${filename}`);
      await fs.writeFile(filepath, Buffer.from(pageBytes));
      files.push({ path: filepath, name: filename });
    }
    
    const sessionId = Date.now().toString();
    processedFiles.set(sessionId, files);
    
    setupAutoCleanup(sessionId, files);
    res.json({ sessionId, count: files.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await cleanupFiles(req.file);
  }
};

const debug = (message, data = '') => {
    console.log(`[${new Date().toISOString()}] [RemovePages] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  };
  
  const removePages = async (req, res) => {
    debug('Starting removePages operation');
    
    try {
      let pagesToRemove;
      
      // Пробуем получить страницы из разных форматов данных
      if (typeof req.body.pages === 'string') {
        try {
          // Если pages пришли как строка JSON
          pagesToRemove = JSON.parse(req.body.pages);
        } catch (e) {
          // Если это просто строка с числами, разделенными запятыми
          pagesToRemove = req.body.pages.split(',').map(num => parseInt(num.trim()));
        }
      } else if (Array.isArray(req.body.pages)) {
        // Если pages уже является массивом
        pagesToRemove = req.body.pages;
      } else {
        debug('Invalid pages format', { receivedPages: req.body.pages });
        return res.status(400).json({ 
          error: 'Pages must be provided as a JSON array or comma-separated numbers'
        });
      }
  
      // Фильтруем и сортируем номера страниц
      pagesToRemove = pagesToRemove
        .map(Number)
        .filter(num => !isNaN(num))
        .sort((a, b) => b - a);
  
      debug('Processed pages to remove', { pagesToRemove });
  
      if (pagesToRemove.length === 0) {
        debug('No valid pages to remove');
        return res.status(400).json({ error: 'No valid page numbers provided' });
      }
  
      // Читаем и обрабатываем PDF
      const pdfBytes = await fs.readFile(req.file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const totalPages = pdfDoc.getPageCount();
  
      debug('PDF document loaded', { totalPages });
  
      // Проверяем валидность номеров страниц
      const invalidPages = pagesToRemove.filter(page => page < 0 || page >= totalPages);
      if (invalidPages.length > 0) {
        debug('Invalid page numbers detected', { invalidPages, totalPages });
        return res.status(400).json({ 
          error: `Invalid page numbers: ${invalidPages.join(', ')}. Total pages: ${totalPages}`
        });
      }
  
      // Удаляем страницы
      pagesToRemove.forEach(pageNumber => {
        debug(`Removing page ${pageNumber}`);
        pdfDoc.removePage(pageNumber);
      });
  
      // Сохраняем результат
      const modifiedPdf = await pdfDoc.save();
      const fileName = `modified-${Date.now()}.pdf`;
      const filePath = path.join('temp', fileName);
      
      await fs.writeFile(filePath, Buffer.from(modifiedPdf));
  
      // Настраиваем сессию
      const sessionId = Date.now().toString();
      const files = [{ path: filePath, name: fileName }];
      processedFiles.set(sessionId, files);
      setupAutoCleanup(sessionId, files);
  
      debug('Operation completed successfully', {
        sessionId,
        removedPages: pagesToRemove.length,
        remainingPages: totalPages - pagesToRemove.length
      });
  
      res.json({
        sessionId,
        count: 1,
        removedPages: pagesToRemove.length,
        originalPages: totalPages,
        remainingPages: totalPages - pagesToRemove.length
      });
  
    } catch (error) {
      debug('Error in removePages', { error: error.message, stack: error.stack });
      res.status(500).json({ error: error.message });
    } finally {
      debug('Starting cleanup');
      await cleanupFiles(req.file);
      debug('Cleanup completed');
    }
  };
  
  // Функция для извлечения изображений из PDF
  const extractImages = async (req, res) => {
    try {
      // Загружаем PDF файл
      const pdfBytes = await fs.readFile(req.file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const extractedImages = [];
      const files = [];
  
      // Проходим по каждой странице PDF
      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        const page = pdfDoc.getPage(i);
        // Получаем все операторы содержимого страницы
        const operators = await page.getOperators();
        
        // Ищем операторы, связанные с изображениями
        for (const op of operators) {
          if (op.name === 'Do' && op.args.length > 0) {
            const xObject = page.node.Resources.get('XObject');
            const name = op.args[0].name;
            const image = xObject.get(name);
            
            if (image && image.getType() === 'XObject' && image.getSubtype() === 'Image') {
              // Извлекаем и сохраняем изображение
              const imgData = await image.getData();
              const fileName = `image-${Date.now()}-${extractedImages.length}.png`;
              const filePath = path.join('temp', fileName);
              await fs.writeFile(filePath, Buffer.from(imgData));
              
              files.push({ path: filePath, name: fileName });
              extractedImages.push(fileName);
            }
          }
        }
      }
      
      // Настраиваем сессию и автоочистку
      const sessionId = Date.now().toString();
      processedFiles.set(sessionId, files);
      setupAutoCleanup(sessionId, files);
      
      res.json({ 
        sessionId, 
        count: files.length,
        message: files.length > 0 ? 'Images extracted successfully' : 'No images found in PDF'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    } finally {
      await cleanupFiles(req.file);
    }
  };
  
  // Функция для реорганизации страниц PDF
  const reorganizePages = async (req, res) => {
    try {
      // Получаем новый порядок страниц из запроса
      const newOrder = req.body.pageOrder.map(Number);
      
      // Загружаем PDF файл
      const pdfBytes = await fs.readFile(req.file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Проверяем валидность порядка страниц
      const totalPages = pdfDoc.getPageCount();
      if (newOrder.some(page => page < 0 || page >= totalPages)) {
        throw new Error('Invalid page numbers in reorder sequence');
      }
      
      // Создаем новый PDF документ с переупорядоченными страницами
      const newPdf = await PDFDocument.create();
      for (const pageNum of newOrder) {
        const [page] = await newPdf.copyPages(pdfDoc, [pageNum]);
        newPdf.addPage(page);
      }
      
      // Сохраняем результат
      const modifiedPdf = await newPdf.save();
      const fileName = `reorganized-${Date.now()}.pdf`;
      const filePath = path.join('temp', fileName);
      await fs.writeFile(filePath, Buffer.from(modifiedPdf));
      
      // Настраиваем сессию и автоочистку
      const sessionId = Date.now().toString();
      const files = [{ path: filePath, name: fileName }];
      processedFiles.set(sessionId, files);
      setupAutoCleanup(sessionId, files);
      
      res.json({ sessionId, count: 1 });
    } catch (error) {
      res.status(500).json({ error: error.message });
    } finally {
      await cleanupFiles(req.file);
    }
  };
  
  // Этот метод будет заглушкой, так как сканирование требует доступа к оборудованию
  const scanToPDF = async (req, res) => {
    res.status(501).json({ 
      error: 'Scanning functionality requires hardware access and is not implemented in this API' 
    });
  };

module.exports = {
  mergePDFs,
  splitPDF,
  removePages,
  extractImages,
  reorganizePages,
  scanToPDF
};