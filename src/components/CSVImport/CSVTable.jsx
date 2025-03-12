import React, { useState } from 'react';
import { useCSVStore } from '../../store/csvStore';
import './CSVTable.css';

const CSVTable = () => {
  const { 
    csvData, 
    headers, 
    validationErrors, 
    updateCell, 
    selectCell,
    selectedCells,
    isValidationMode,
    sortByColumn
  } = useCSVStore();
  
  const [editingCell, setEditingCell] = useState(null);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
  
  // Check if a cell has validation errors
  const getCellError = (rowId, column) => {
    if (!isValidationMode) return null;
    
    return validationErrors.find(
      error => error.rowId === rowId && error.column === column
    );
  };
  
  // Check if a cell is currently selected
  const isCellSelected = (rowId, column) => {
    return selectedCells.some(
      cell => cell.rowId === rowId && cell.column === column
    );
  };
  
  // Handle cell click for selection
  const handleCellClick = (rowId, column, event) => {
    const isMultiSelect = event.ctrlKey || event.metaKey;
    selectCell(rowId, column, isMultiSelect);
  };
  
  // Handle double click to edit
  const handleCellDoubleClick = (rowId, column, value) => {
    setEditingCell({ rowId, column, value });
  };
  
  // Handle cell edit completion
  const handleCellEditComplete = (rowId, column, newValue) => {
    updateCell(rowId, column, newValue);
    setEditingCell(null);
  };
  
  // Handle column header click for sorting
  const handleHeaderClick = (column) => {
    let direction = 'asc';
    
    if (sortConfig.column === column) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ column, direction });
    sortByColumn(column, direction);
  };
  
  // Render cell content
  const renderCell = (row, column) => {
    const rowId = row._id;
    const value = row[column];
    const error = getCellError(rowId, column);
    const isSelected = isCellSelected(rowId, column);
    
    // If this cell is being edited
    if (editingCell && editingCell.rowId === rowId && editingCell.column === column) {
      return (
        <input
          type="text"
          value={editingCell.value || ''}
          onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
          onBlur={() => handleCellEditComplete(rowId, column, editingCell.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCellEditComplete(rowId, column, editingCell.value);
            } else if (e.key === 'Escape') {
              setEditingCell(null);
            }
          }}
          autoFocus
          className="cell-editor"
        />
      );
    }
    
    // Regular cell display
    return (
      <div 
        className={`cell-content ${error ? 'has-error' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={(e) => handleCellClick(rowId, column, e)}
        onDoubleClick={() => handleCellDoubleClick(rowId, column, value)}
        title={error ? error.error : ''}
      >
        {value || ''}
        {error && <span className="error-indicator">!</span>}
      </div>
    );
  };
  
  // If no data, show a message
  if (!csvData.length) {
    return <div className="no-data">No CSV data loaded</div>;
  }
  
  return (
    <div className="csv-table-container">
      <table className="csv-table">
        <thead>
          <tr>
            {headers.map(header => (
              <th 
                key={header}
                onClick={() => handleHeaderClick(header)}
                className={sortConfig.column === header ? `sorted-${sortConfig.direction}` : ''}
              >
                {header}
                {sortConfig.column === header && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {csvData.map(row => (
            <tr key={row._id}>
              {headers.map(header => (
                <td key={`${row._id}-${header}`}>
                  {renderCell(row, header)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CSVTable; 