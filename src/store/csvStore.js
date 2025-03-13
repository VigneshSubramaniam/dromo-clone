import { create } from 'zustand';
import Papa from 'papaparse';

// Constants
const CHUNK_SIZE = 1000; // Process 1000 rows at a time
const VALIDATION_BATCH_SIZE = 500; // Validate 500 rows at a time
const VALIDATION_DEBOUNCE_MS = 300; // Debounce validation by 300ms

// Helper for chunked operations
const processInChunks = (items, chunkSize, processor) => {
  let index = 0;
  
  return new Promise((resolve) => {
    function nextChunk() {
      const chunk = items.slice(index, index + chunkSize);
      index += chunkSize;
      
      // Process this chunk
      processor(chunk);
      
      // If there are more items to process, schedule next chunk
      if (index < items.length) {
        setTimeout(nextChunk, 0);
      } else {
        resolve();
      }
    }
    
    // Start processing
    nextChunk();
  });
};

// Validation rules
const validateCell = (value, header, rowIndex) => {
  // Only perform validation if value is empty or header suggests a specific type
  const headerLower = header.toLowerCase();
  const needsValidation = 
    value === undefined || 
    value === null || 
    value === '' ||
    headerLower.includes('email') ||
    headerLower.includes('date') ||
    headerLower.includes('number');
    
  if (!needsValidation) return null;
  
  // Empty value check
  if (value === undefined || value === null || value === '') {
    return { error: 'Missing value', severity: 'error' };
  }
  
  // Email validation
  if (headerLower.includes('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { error: 'Invalid email format', severity: 'error' };
  }
  
  // Date validation
  if (headerLower.includes('date') && isNaN(Date.parse(value))) {
    return { error: 'Invalid date format', severity: 'error' };
  }
  
  // Number validation
  if (headerLower.includes('number') && isNaN(Number(value))) {
    return { error: 'Invalid number format', severity: 'error' };
  }
  
  return null;
};

// Create debounced function
const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

export const useCSVStore = create((set, get) => {
  // Track validation timer for cleanup
  let validationTimer = null;
  
  return {
    csvData: [],
    headers: [],
    originalData: [],
    isLoading: false,
    loadingProgress: 0,
    validationErrors: [],
    selectedCells: [],
    isValidationMode: false,
    processingChunk: false,
    
    // Upload and parse CSV with chunked processing
    uploadCSV: async (file) => {
      set({ 
        isLoading: true,
        loadingProgress: 0,
        csvData: [],
        headers: [],
        originalData: [],
        validationErrors: [],
        selectedCells: [],
        isValidationMode: false 
      });
      
      // First, get headers by parsing just the first row
      Papa.parse(file, {
        header: true,
        preview: 1,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          set({ headers });
          
          // Now process the full file - but don't use worker: true
          let rowCount = 0;
          let allData = [];
          
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            // Removed worker: true as it's causing issues
            chunk: async (results) => {
              // Add row IDs to this chunk
              const dataWithIds = results.data.map((row, index) => ({
                ...row,
                _id: (rowCount + index).toString(),
              }));
              
              // Track overall progress
              rowCount += results.data.length;
              allData = [...allData, ...dataWithIds];
              
              // Update state with batch of rows and progress
              set(state => ({ 
                csvData: [...state.csvData, ...dataWithIds],
                loadingProgress: Math.min(99, Math.floor((rowCount / (rowCount + 100)) * 100))
              }));
            },
            complete: () => {
              // Save a copy of original data for reset functionality
              set({ 
                originalData: JSON.parse(JSON.stringify(allData)),
                isLoading: false,
                loadingProgress: 100
              });
              
              // Run initial validation in chunks
              get().validateData();
            },
            error: (error) => {
              console.error("CSV Parsing error:", error);
              set({ 
                isLoading: false,
                loadingProgress: 0
              });
              // You could add error handling state here
            }
          });
        }
      });
    },
    
    // Validate all data with chunked processing
    validateData: () => {
      // Clear previous validation timer if exists
      if (validationTimer) clearTimeout(validationTimer);
      
      // Use debounce to avoid too frequent validations
      validationTimer = setTimeout(() => {
        const { csvData, headers } = get();
        const errors = [];
        let isProcessing = true;
        
        set({ processingChunk: true });
        
        // Process validation in chunks to prevent UI freezing
        let currentChunk = 0;
        
        function processNextChunk() {
          const start = currentChunk * VALIDATION_BATCH_SIZE;
          const end = Math.min(start + VALIDATION_BATCH_SIZE, csvData.length);
          
          if (start >= csvData.length) {
            // Finished processing all chunks
            set({ 
              validationErrors: errors,
              processingChunk: false
            });
            return;
          }
          
          // Process this chunk
          for (let rowIndex = start; rowIndex < end; rowIndex++) {
            const row = csvData[rowIndex];
            
            headers.forEach(header => {
              const value = row[header];
              const validationResult = validateCell(value, header, rowIndex);
              
              if (validationResult) {
                errors.push({
                  rowId: row._id,
                  rowIndex,
                  column: header,
                  value,
                  ...validationResult
                });
              }
            });
          }
          
          // Update progress and schedule next chunk
          currentChunk++;
          setTimeout(processNextChunk, 0);
        }
        
        // Start processing
        processNextChunk();
        
        return errors.length === 0;
      }, VALIDATION_DEBOUNCE_MS);
      
      return true; // Optimistically return true
    },
    
    // Update single cell value
    updateCell: (rowId, column, value) => {
      set(state => {
        // Find the row by ID
        const rowIndex = state.csvData.findIndex(row => row._id === rowId);
        
        if (rowIndex !== -1) {
          // Create a new data array with the updated cell
          const newData = [...state.csvData];
          newData[rowIndex] = {
            ...newData[rowIndex],
            [column]: value
          };
          return { csvData: newData };
        }
        
        return {}; // No change needed
      });
      
      // Debounced validation after update
      get().validateData();
    },
    
    // Select cells for bulk operations
    selectCell: (rowId, column, isMultiSelect = false) => {
      set(state => {
        if (!isMultiSelect) {
          return { selectedCells: [{ rowId, column }] };
        }
        
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
    
    // Bulk update selected cells with chunked processing
    bulkUpdateSelected: (newValue) => {
      // First, get the current state once to avoid stale state issues
      const { selectedCells, csvData } = get();
      
      if (selectedCells.length === 0) return;
      
      // Create a new copy of the data array
      const updatedData = [...csvData];
      
      // Process all selections at once for smaller datasets
      if (selectedCells.length <= 1000) {
        selectedCells.forEach(cell => {
          const rowIndex = updatedData.findIndex(row => row._id === cell.rowId);
          if (rowIndex !== -1) {
            updatedData[rowIndex] = {
              ...updatedData[rowIndex],
              [cell.column]: newValue
            };
          }
        });
        
        // Update state in one operation
        set({ csvData: updatedData });
        get().validateData();
        return;
      }
      
      // For larger datasets, process in chunks
      let processedCount = 0;
      const totalCells = selectedCells.length;
      const batchSize = 1000;
      
      const processNextBatch = () => {
        // Get the next batch
        const endIndex = Math.min(processedCount + batchSize, totalCells);
        const currentBatch = selectedCells.slice(processedCount, endIndex);
        
        // Process this batch
        currentBatch.forEach(cell => {
          const rowIndex = updatedData.findIndex(row => row._id === cell.rowId);
          if (rowIndex !== -1) {
            updatedData[rowIndex] = {
              ...updatedData[rowIndex],
              [cell.column]: newValue
            };
          }
        });
        
        // Update processed count
        processedCount = endIndex;
        
        // If we've processed everything, update the state and validate
        if (processedCount >= totalCells) {
          set({ csvData: updatedData });
          get().validateData();
        } else {
          // Otherwise, process the next batch after a brief delay
          setTimeout(processNextBatch, 0);
        }
      };
      
      // Start processing
      processNextBatch();
    },
    
    // Filter rows based on a condition - optimized for large datasets
    filterRows: (column, filterValue) => {
      set({ isLoading: true });
      
      setTimeout(() => {
        const { originalData } = get();
        
        if (!filterValue) {
          set({ csvData: [...originalData], isLoading: false });
          return;
        }
        
        const lowerFilterValue = filterValue.toLowerCase();
        const filteredData = originalData.filter(row => {
          const cellValue = String(row[column] || '').toLowerCase();
          return cellValue.includes(lowerFilterValue);
        });
        
        set({ csvData: filteredData, isLoading: false });
      }, 0);
    },
    
    // Sort data by column
    sortByColumn: (column, direction = 'asc') => {
      set({ isLoading: true });
      
      setTimeout(() => {
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
          
          return { csvData: newData, isLoading: false };
        });
      }, 0);
    },
    
    // Reset to original data
    resetData: () => {
      set({ isLoading: true });
      
      setTimeout(() => {
        set(state => ({ 
          csvData: JSON.parse(JSON.stringify(state.originalData)),
          selectedCells: [],
          isLoading: false
        }));
        
        get().validateData();
      }, 0);
    },
    
    // Clear all data
    clearData: () => {
      set({ 
        csvData: [],
        headers: [],
        originalData: [],
        validationErrors: [],
        selectedCells: [],
        isValidationMode: false,
        isLoading: false,
        loadingProgress: 0
      });
    },
    
    // Toggle validation mode
    toggleValidationMode: () => {
      set(state => ({ isValidationMode: !state.isValidationMode }));
    },
    
    // Check if import is ready (no validation errors)
    isReadyToImport: () => {
      return get().validationErrors.length === 0;
    },
    
    // Select all cells in a column
    selectColumn: (columnName) => {
      set(state => {
        // Start with an empty selection array
        const columnCells = [];
        
        // Process in batches to prevent freezing
        const batchSize = 100;
        const totalRows = state.csvData.length;
        
        // Use a more efficient loop instead of map
        for (let i = 0; i < totalRows; i++) {
          columnCells.push({
            rowId: state.csvData[i]._id,
            column: columnName
          });
          
          // After each batch, allow UI thread to breathe
          if (i % batchSize === 0 && i > 0) {
            setTimeout(() => {}, 0);
          }
        }
        
        return { selectedCells: columnCells };
      });
    },
    
    // Copy value from a source cell to all selected cells
    copyToSelected: (sourceRowId, sourceColumn) => {
      // Get current state
      const { selectedCells, csvData } = get();
      
      // Find the source value
      const sourceRow = csvData.find(row => row._id === sourceRowId);
      if (!sourceRow) return;
      
      const sourceValue = sourceRow[sourceColumn];
      const updatedData = [...csvData];
      
      // Process all cells at once for smaller selections
      if (selectedCells.length <= 1000) {
        selectedCells.forEach(cell => {
          // Skip the source cell itself
          if (cell.rowId === sourceRowId && cell.column === sourceColumn) return;
          
          const rowIndex = updatedData.findIndex(row => row._id === cell.rowId);
          if (rowIndex !== -1) {
            updatedData[rowIndex] = {
              ...updatedData[rowIndex],
              [cell.column]: sourceValue
            };
          }
        });
        
        set({ csvData: updatedData });
        get().validateData();
        return;
      }
      
      // For larger datasets, process in chunks
      let processedCount = 0;
      const totalCells = selectedCells.length;
      const batchSize = 1000;
      
      const processNextBatch = () => {
        const endIndex = Math.min(processedCount + batchSize, totalCells);
        const currentBatch = selectedCells.slice(processedCount, endIndex);
        
        currentBatch.forEach(cell => {
          // Skip the source cell itself
          if (cell.rowId === sourceRowId && cell.column === sourceColumn) return;
          
          const rowIndex = updatedData.findIndex(row => row._id === cell.rowId);
          if (rowIndex !== -1) {
            updatedData[rowIndex] = {
              ...updatedData[rowIndex],
              [cell.column]: sourceValue
            };
          }
        });
        
        processedCount = endIndex;
        
        if (processedCount >= totalCells) {
          set({ csvData: updatedData });
          get().validateData();
        } else {
          setTimeout(processNextBatch, 0);
        }
      };
      
      processNextBatch();
    },
    
    // Clear all selections
    clearSelection: () => {
      set({ selectedCells: [] });
    }
  };
}); 