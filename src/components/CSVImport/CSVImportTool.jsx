import React, { useRef } from 'react';
import { useCSVStore } from '../../store/csvStore';
import CSVTable from './CSVTable';
import ValidationSummary from './ValidationSummary';
import ToolbarActions from './ToolbarActions';
import './CSVImportTool.css';

const CSVImportTool = () => {
  const fileInputRef = useRef(null);
  const { 
    csvData, 
    headers, 
    isLoading, 
    validationErrors, 
    uploadCSV,
    isValidationMode
  } = useCSVStore();

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadCSV(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="csv-import-tool">
      <h1>CSV Import & Validation Tool</h1>
      
      {!csvData.length ? (
        <div className="upload-container">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="file-input"
          />
          <button 
            onClick={triggerFileInput} 
            className="upload-button"
          >
            Upload CSV File
          </button>
          <p className="upload-hint">
            Upload a CSV file to preview and validate its contents
          </p>
        </div>
      ) : (
        <>
          <ToolbarActions />
          
          {isLoading ? (
            <div className="loading">Loading CSV data...</div>
          ) : (
            <>
              <CSVTable />
              
              {isValidationMode && validationErrors.length > 0 && (
                <ValidationSummary />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CSVImportTool; 