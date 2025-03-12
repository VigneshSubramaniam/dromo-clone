import React, { useState, useCallback, useMemo } from 'react';
import { useCSVStore } from '../../store/csvStore';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
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
  
  // Check if a cell has validation errors - memo for performance
  const errorMap = useMemo(() => {
    if (!isValidationMode || !validationErrors.length) return {};
    
    return validationErrors.reduce((acc, error) => {
      const key = `${error.rowId}-${error.column}`;
      acc[key] = error;
      return acc;
    }, {});
  }, [validationErrors, isValidationMode]);
  
  // Check if a cell is currently selected - memo for performance
  const selectionMap = useMemo(() => {
    return selectedCells.reduce((acc, cell) => {
      const key = `${cell.rowId}-${cell.column}`;
      acc[key] = true;
      return acc;
    }, {});
  }, [selectedCells]);
  
  const getCellError = useCallback((rowId, column) => {
    if (!isValidationMode) return null;
    return errorMap[`${rowId}-${column}`];
  }, [errorMap, isValidationMode]);
  
  const isCellSelected = useCallback((rowId, column) => {
    return selectionMap[`${rowId}-${column}`] || false;
  }, [selectionMap]);
  
  // Handle cell click for selection
  const handleCellClick = useCallback((rowId, column, event) => {
    const isMultiSelect = event.ctrlKey || event.metaKey;
    selectCell(rowId, column, isMultiSelect);
  }, [selectCell]);
  
  // Handle double click to edit
  const handleCellDoubleClick = useCallback((rowId, column, value) => {
    setEditingCell({ rowId, column, value });
  }, []);
  
  // Handle cell edit completion
  const handleCellEditComplete = useCallback((rowId, column, newValue) => {
    updateCell(rowId, column, newValue);
    setEditingCell(null);
  }, [updateCell]);
  
  // Handle column header click for sorting
  const handleHeaderClick = useCallback((column) => {
    let direction = 'asc';
    
    if (sortConfig.column === column) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ column, direction });
    sortByColumn(column, direction);
  }, [sortConfig, sortByColumn]);
  
  // Render cell content
  const renderCell = useCallback((row, column) => {
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
  }, [editingCell, getCellError, isCellSelected, handleCellClick, handleCellDoubleClick, handleCellEditComplete]);
  
  // Row renderer for virtualized list
  const Row = useCallback(({ index, style }) => {
    const row = csvData[index];
    
    return (
      <div className="table-row" style={style}>
        {headers.map((header, colIndex) => (
          <div 
            key={`${row._id}-${header}`}
            className="table-cell"
            style={{ width: `${100 / headers.length}%` }}
          >
            {renderCell(row, header)}
          </div>
        ))}
      </div>
    );
  }, [csvData, headers, renderCell]);
  
  // Header row
  const HeaderRow = useCallback(() => (
    <div className="table-header-row">
      {headers.map((header, index) => (
        <div 
          key={header}
          className={`table-header-cell ${sortConfig.column === header ? `sorted-${sortConfig.direction}` : ''}`}
          style={{ width: `${100 / headers.length}%` }}
          onClick={() => handleHeaderClick(header)}
        >
          {header}
          {sortConfig.column === header && (
            <span className="sort-indicator">
              {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
            </span>
          )}
        </div>
      ))}
    </div>
  ), [headers, sortConfig, handleHeaderClick]);
  
  // If no data, show a message
  if (!csvData.length) {
    return <div className="no-data">No CSV data loaded</div>;
  }
  
  // Calculate item size (row height) based on content
  const itemSize = 40; // Default row height
  
  return (
    <div className="csv-table-container">
      <HeaderRow />
      <div className="table-body">
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={Math.min(height || 600, itemSize * Math.min(csvData.length, 15))}
              width={width}
              itemCount={csvData.length}
              itemSize={itemSize}
              overscanCount={5}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
};

export default React.memo(CSVTable); 