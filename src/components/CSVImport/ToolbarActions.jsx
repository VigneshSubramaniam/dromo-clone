import React, { useState } from 'react';
import { useCSVStore } from '../../store/csvStore';
import './ToolbarActions.css';

const ToolbarActions = () => {
  const { 
    headers, 
    selectedCells, 
    bulkUpdateSelected, 
    filterRows, 
    resetData, 
    clearData,
    validateData,
    isValidationMode,
    toggleValidationMode,
    isReadyToImport,
    validationErrors
  } = useCSVStore();
  
  const [bulkValue, setBulkValue] = useState('');
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  
  // Apply bulk update to selected cells
  const handleBulkUpdate = () => {
    bulkUpdateSelected(bulkValue);
    setBulkValue('');
  };
  
  // Apply filter
  const handleFilter = () => {
    if (filterColumn) {
      filterRows(filterColumn, filterValue);
    }
  };
  
  // Clear filter
  const handleClearFilter = () => {
    setFilterValue('');
    filterRows(filterColumn, '');
  };
  
  // Handle import finalization
  const handleFinalize = () => {
    const isValid = validateData();
    if (isValid) {
      alert('CSV data is valid and ready for import!');
      // Here you would typically send the data to your backend
    } else {
      alert('Please fix validation errors before importing.');
    }
  };
  
  return (
    <div className="toolbar-actions">
      <div className="toolbar-section">
        <h3>Bulk Actions</h3>
        <div className="action-group">
          <input
            type="text"
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            placeholder="Value for selected cells"
            disabled={selectedCells.length === 0}
          />
          <button 
            onClick={handleBulkUpdate}
            disabled={selectedCells.length === 0}
          >
            Update {selectedCells.length} selected {selectedCells.length === 1 ? 'cell' : 'cells'}
          </button>
        </div>
      </div>
      
      <div className="toolbar-section">
        <h3>Filter</h3>
        <div className="action-group">
          <select 
            value={filterColumn} 
            onChange={(e) => setFilterColumn(e.target.value)}
          >
            <option value="">Select column</option>
            {headers.map(header => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
          <input
            type="text"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            placeholder="Filter value"
            disabled={!filterColumn}
          />
          <button onClick={handleFilter} disabled={!filterColumn}>Apply Filter</button>
          <button onClick={handleClearFilter} disabled={!filterColumn}>Clear Filter</button>
        </div>
      </div>
      
      <div className="toolbar-section">
        <h3>Data Actions</h3>
        <div className="action-group">
          <button onClick={resetData}>Reset Changes</button>
          <button onClick={clearData}>Clear All Data</button>
          <button 
            onClick={toggleValidationMode}
            className={isValidationMode ? 'active' : ''}
          >
            {isValidationMode ? 'Hide Validation' : 'Show Validation'}
          </button>
          <button 
            onClick={handleFinalize}
            className="finalize-button"
            disabled={isValidationMode && validationErrors.length > 0}
          >
            Finalize Import
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolbarActions; 