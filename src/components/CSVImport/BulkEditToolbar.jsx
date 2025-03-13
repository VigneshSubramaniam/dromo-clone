import React, { useState } from 'react';
import { useCSVStore } from '../../store/csvStore';
import './BulkEditToolbar.css';

const BulkEditToolbar = () => {
  const { 
    selectedCells, 
    bulkUpdateSelected, 
    clearSelection,
    copyToSelected,
    headers,
    selectColumn
  } = useCSVStore();
  
  const [bulkValue, setBulkValue] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // No cells selected, don't show the toolbar
  if (!selectedCells.length) {
    return null;
  }
  
  // Apply bulk update to selected cells
  const handleBulkUpdate = () => {
    if (selectedCells.length > 100) {
      setIsProcessing(true);
      
      // Start the update process
      bulkUpdateSelected(bulkValue);
      
      // Clear the form and reset loading after a delay
      setTimeout(() => {
        setBulkValue('');
        setIsProcessing(false);
      }, 500);
    } else {
      // For smaller selections, update immediately
      bulkUpdateSelected(bulkValue);
      setBulkValue('');
    }
  };
  
  // Select entire column
  const handleSelectColumn = () => {
    if (selectedColumn) {
      setIsProcessing(true);
      
      // Do the selection
      selectColumn(selectedColumn);
      
      // Reset after a delay
      setTimeout(() => {
        setSelectedColumn('');
        setIsProcessing(false);
      }, 300);
    }
  };
  
  // Handle copy from first selected cell to others
  const handleCopyFromFirst = () => {
    if (selectedCells.length > 1) {
      const firstCell = selectedCells[0];
      copyToSelected(firstCell.rowId, firstCell.column);
    }
  };
  
  return (
    <div className="bulk-edit-toolbar">
      <div className="bulk-selection-info">
        <span className="selection-count">{selectedCells.length} cells selected</span>
        <button className="clear-selection-btn" onClick={clearSelection}>Clear Selection</button>
      </div>
      
      <div className="bulk-edit-controls">
        {isProcessing && (
          <div className="processing-indicator">
            Processing large selection...
          </div>
        )}
        <div className="bulk-edit-group">
          <input 
            type="text" 
            value={bulkValue} 
            onChange={(e) => setBulkValue(e.target.value)}
            placeholder="New value for selected cells"
            className="bulk-value-input"
          />
          <button 
            onClick={handleBulkUpdate} 
            className="bulk-update-btn"
            disabled={!bulkValue}
          >
            Update Selected
          </button>
        </div>
        
        <div className="bulk-edit-group">
          <select 
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            className="column-select"
          >
            <option value="">Select a column</option>
            {headers.map(header => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
          <button 
            onClick={handleSelectColumn} 
            className="select-column-btn"
            disabled={!selectedColumn}
          >
            Select Column
          </button>
        </div>
        
        <button 
          onClick={handleCopyFromFirst} 
          className="copy-first-btn"
          disabled={selectedCells.length < 2}
          title="Copy value from the first selected cell to all other selected cells"
        >
          Copy From First Cell
        </button>
      </div>
      
      <div className="selection-help">
        <span className="help-text">Shift+Click: Select cells | Ctrl+Shift+Click: Multi-select | Right-click header: Select column</span>
      </div>
    </div>
  );
};

export default BulkEditToolbar; 