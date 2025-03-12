import { create } from 'zustand';
import Papa from 'papaparse';

// Validation rules
const validateCell = (value, header, rowIndex) => {
  // Example validation rules - customize as needed
  if (value === undefined || value === null || value === '') {
    return { error: 'Missing value', severity: 'error' };
  }
  
  // Email validation
  if (header.toLowerCase().includes('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { error: 'Invalid email format', severity: 'error' };
  }
  
  // Date validation
  if (header.toLowerCase().includes('date') && isNaN(Date.parse(value))) {
    return { error: 'Invalid date format', severity: 'error' };
  }
  
  // Number validation
  if (header.toLowerCase().includes('number') && isNaN(Number(value))) {
    return { error: 'Invalid number format', severity: 'error' };
  }
  
  return null;
};

export const useCSVStore = create((set, get) => ({
  csvData: [],
  headers: [],
  originalData: [],
  isLoading: false,
  validationErrors: [],
  selectedCells: [],
  isValidationMode: false,
  
  // Upload and parse CSV
  uploadCSV: async (file) => {
    set({ isLoading: true });
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        
        // Add row IDs to make tracking and updates easier
        const dataWithIds = results.data.map((row, index) => ({
          ...row,
          _id: index.toString(),
        }));
        
        set({ 
          csvData: dataWithIds,
          originalData: JSON.parse(JSON.stringify(dataWithIds)),
          headers,
          isLoading: false,
          validationErrors: [],
        });
        
        // Run initial validation
        get().validateData();
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        set({ isLoading: false });
      }
    });
  },
  
  // Validate all data
  validateData: () => {
    const { csvData, headers } = get();
    const errors = [];
    
    csvData.forEach((row, rowIndex) => {
      headers.forEach(header => {
        const validationResult = validateCell(row[header], header, rowIndex);
        if (validationResult) {
          errors.push({
            rowId: row._id,
            rowIndex,
            column: header,
            ...validationResult
          });
        }
      });
    });
    
    set({ 
      validationErrors: errors,
      isValidationMode: true 
    });
    
    return errors.length === 0;
  },
  
  // Update a cell value
  updateCell: (rowId, column, value) => {
    set(state => {
      const newData = [...state.csvData];
      const rowIndex = newData.findIndex(row => row._id === rowId);
      
      if (rowIndex !== -1) {
        newData[rowIndex] = {
          ...newData[rowIndex],
          [column]: value
        };
      }
      
      return { csvData: newData };
    });
    
    // Re-validate after update
    get().validateData();
  },
  
  // Select cells for bulk operations
  selectCell: (rowId, column, isMultiSelect = false) => {
    set(state => {
      if (!isMultiSelect) {
        return { selectedCells: [{ rowId, column }] };
      }
      
      // For multi-select, toggle selection
      const existingSelection = state.selectedCells.findIndex(
        cell => cell.rowId === rowId && cell.column === column
      );
      
      if (existingSelection !== -1) {
        const newSelection = [...state.selectedCells];
        newSelection.splice(existingSelection, 1);
        return { selectedCells: newSelection };
      } else {
        return { selectedCells: [...state.selectedCells, { rowId, column }] };
      }
    });
  },
  
  // Bulk update selected cells
  bulkUpdateSelected: (value) => {
    const { selectedCells } = get();
    
    selectedCells.forEach(({ rowId, column }) => {
      get().updateCell(rowId, column, value);
    });
  },
  
  // Filter rows based on a condition
  filterRows: (column, filterValue) => {
    const { originalData } = get();
    
    if (!filterValue) {
      set({ csvData: [...originalData] });
      return;
    }
    
    const filteredData = originalData.filter(row => {
      const cellValue = String(row[column] || '').toLowerCase();
      return cellValue.includes(filterValue.toLowerCase());
    });
    
    set({ csvData: filteredData });
  },
  
  // Sort data by column
  sortByColumn: (column, direction = 'asc') => {
    set(state => {
      const newData = [...state.csvData];
      
      newData.sort((a, b) => {
        const valueA = a[column] || '';
        const valueB = b[column] || '';
        
        // Try to sort as numbers if possible
        const numA = Number(valueA);
        const numB = Number(valueB);
        
        if (!isNaN(numA) && !isNaN(numB)) {
          return direction === 'asc' ? numA - numB : numB - numA;
        }
        
        // Otherwise sort as strings
        return direction === 'asc' 
          ? String(valueA).localeCompare(String(valueB))
          : String(valueB).localeCompare(String(valueA));
      });
      
      return { csvData: newData };
    });
  },
  
  // Reset to original data
  resetData: () => {
    set(state => ({ 
      csvData: JSON.parse(JSON.stringify(state.originalData)),
      selectedCells: []
    }));
    get().validateData();
  },
  
  // Clear all data
  clearData: () => {
    set({ 
      csvData: [],
      headers: [],
      originalData: [],
      validationErrors: [],
      selectedCells: [],
      isValidationMode: false
    });
  },
  
  // Toggle validation mode
  toggleValidationMode: () => {
    set(state => ({ isValidationMode: !state.isValidationMode }));
  },
  
  // Check if import is ready (no validation errors)
  isReadyToImport: () => {
    return get().validationErrors.length === 0;
  }
})); 