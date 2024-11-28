// utils/debugUtils.js
const debug = (namespace) => (message, data = '') => {
    const timestamp = new Date().toISOString();
    const dataString = data ? JSON.stringify(data, null, 2) : '';
    console.log(`[${timestamp}] [${namespace}] ${message} ${dataString}`);
  };
  
  module.exports = debug;
  