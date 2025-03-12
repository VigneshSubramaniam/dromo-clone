import React from 'react';
import { createRoot } from 'react-dom/client';
import CSVImportTool from './components/CSVImport/CSVImportTool';
import './index.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CSVImportTool />
  </React.StrictMode>
); 