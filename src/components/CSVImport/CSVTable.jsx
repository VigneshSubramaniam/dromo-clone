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
    sortByColumn,
    selectColumn
  } = useCSVStore();
  
  const [editingCell, setEditingCell] = useState(null);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
  
  // Define cell width constant
  const CELL_WIDTH = 150; // Fixed width for each cell (in pixels)
  const tableWidth = headers.length * CELL_WIDTH;
  
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
  
  // Handle cell click - now initiates editing instead of selection
  const handleCellClick = useCallback((rowId, column, value, event) => {
    // If we're already editing a cell, finish that edit first
    if (editingCell) {
      updateCell(editingCell.rowId, editingCell.column, editingCell.value);
      setEditingCell(null);
    }

    // Check if this is a selection operation (with shift key)
    if (event.shiftKey) {
      const isMultiSelect = event.ctrlKey || event.metaKey;
      event.preventDefault(); // Prevent default behavior
      selectCell(rowId, column, isMultiSelect);
      return;
    }
    
    // Otherwise, it's an edit operation
    setEditingCell({ rowId, column, value });
    
    // Prevent the event from bubbling to avoid issues
    event.stopPropagation();
  }, [editingCell, updateCell, selectCell]);
  
  // Handle cell edit completion
  const handleCellEditComplete = useCallback((rowId, column, newValue) => {
    updateCell(rowId, column, newValue);
    setEditingCell(null);
  }, [updateCell]);
  
  // Handle column header click for sorting
  const handleHeaderClick = useCallback((column) => {
    // First, complete any in-progress edits
    if (editingCell) {
      handleCellEditComplete(editingCell.rowId, editingCell.column, editingCell.value);
    }
    
    let direction = 'asc';
    
    if (sortConfig.column === column) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ column, direction });
    sortByColumn(column, direction);
  }, [sortConfig, sortByColumn, editingCell, handleCellEditComplete]);
  
  // Handle outside clicks to finish editing
  React.useEffect(() => {
    if (!editingCell) return;
    
    const handleClickOutside = (event) => {
      // If clicked outside the editing cell, complete the edit
      if (!event.target.closest('.cell-editor')) {
        handleCellEditComplete(editingCell.rowId, editingCell.column, editingCell.value);
      }
    };
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingCell, handleCellEditComplete]);
  
  // Handle key presses during editing
  const handleKeyDown = useCallback((e) => {
    if (!editingCell) return;
    
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault(); // Prevent default tab behavior
      handleCellEditComplete(editingCell.rowId, editingCell.column, editingCell.value);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  }, [editingCell, handleCellEditComplete]);
  
  // Add a column header context menu function
  const handleHeaderContextMenu = useCallback((event, column) => {
    event.preventDefault();
    // Select the entire column
    selectColumn(column);
  }, [selectColumn]);
  
  // Render cell content
  const renderCell = useCallback((row, column) => {
    const rowId = row._id;
    const value = row[column];
    const error = getCellError(rowId, column);
    const isSelected = isCellSelected(rowId, column);
    const isEditing = editingCell && editingCell.rowId === rowId && editingCell.column === column;
    
    // If this cell is being edited
    if (isEditing) {
      return (
        <input
          type="text"
          value={editingCell.value !== undefined ? editingCell.value : ''}
          onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
          onKeyDown={handleKeyDown}
          autoFocus
          className="cell-editor"
          onClick={(e) => e.stopPropagation()}
        />
      );
    }
    
    // Regular cell display
    return (
      <div 
        className={`cell-content ${error ? 'has-error' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={(e) => handleCellClick(rowId, column, value, e)}
        title={error ? error.error : 'Click to edit'}
      >
        {value || ''}
        {error && <span className="error-indicator">!</span>}
      </div>
    );
  }, [editingCell, getCellError, isCellSelected, handleCellClick, handleKeyDown]);
  
  // Row renderer for virtualized list
  const Row = useCallback(({ index, style }) => {
    const row = csvData[index];
    
    return (
      <div className="table-row" style={style}>
        {headers.map((header, colIndex) => (
          <div 
            key={`${row._id}-${header}`}
            className="table-cell"
            style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
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
          style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
          onClick={() => handleHeaderClick(header)}
          onContextMenu={(e) => handleHeaderContextMenu(e, header)}
          title="Click to sort, right-click to select column"
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
  ), [headers, sortConfig, handleHeaderClick, handleHeaderContextMenu]);
  
  // If no data, show a message
  if (!csvData.length) {
    return <div className="no-data">No CSV data loaded</div>;
  }
  
  // Calculate item size (row height) based on content
  const itemSize = 40; // Default row height
  
  return (
    <div className="csv-table-container">
      <div className="table-scrollable">
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
    </div>
  );
};

export default React.memo(CSVTable); 