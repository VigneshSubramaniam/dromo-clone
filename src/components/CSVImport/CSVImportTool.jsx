import React, { useRef } from 'react';
import { useCSVStore } from '../../store/csvStore';
import CSVTable from './CSVTable';
import ValidationSummary from './ValidationSummary';
import ToolbarActions from './ToolbarActions';
import BulkEditToolbar from './BulkEditToolbar';
import './CSVImportTool.css';

const CSVImportTool = () => {
  const fileInputRef = useRef(null);
  const { 
    csvData, 
    headers, 
    isLoading, 
    loadingProgress,
    validationErrors, 
    uploadCSV,
    isValidationMode,
    processingChunk
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
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Upload CSV File'}
          </button>
          <p className="upload-hint">
            Upload a CSV file to preview and validate its contents
          </p>
        </div>
      ) : (
        <>
          <ToolbarActions disabled={isLoading || processingChunk} />
          
          {isLoading ? (
            <div className="loading">
              <div className="loading-text">Processing CSV data...</div>
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="loading-percentage">{loadingProgress}%</div>
            </div>
          ) : (
            <>
              <BulkEditToolbar />
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