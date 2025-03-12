import React from 'react';
import { useCSVStore } from '../../store/csvStore';
import './ValidationSummary.css';

const ValidationSummary = () => {
  const { validationErrors, csvData } = useCSVStore();
  
  // Group errors by type
  const errorsByType = validationErrors.reduce((acc, error) => {
    const type = error.error;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(error);
    return acc;
  }, {});
  
  // Calculate error statistics
  const totalRows = csvData.length;
  const rowsWithErrors = new Set(validationErrors.map(err => err.rowId)).size;
  const errorPercentage = Math.round((rowsWithErrors / totalRows) * 100);
  
  return (
    <div className="validation-summary">
      <h2>Validation Summary</h2>
      
      <div className="validation-stats">
        <div className="stat-item">
          <span className="stat-label">Total Rows:</span>
          <span className="stat-value">{totalRows}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Rows with Errors:</span>
          <span className="stat-value">{rowsWithErrors}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Error Percentage:</span>
          <span className="stat-value">{errorPercentage}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Issues:</span>
          <span className="stat-value">{validationErrors.length}</span>
        </div>
      </div>
      
      <div className="error-breakdown">
        <h3>Error Breakdown</h3>
        {Object.entries(errorsByType).map(([errorType, errors]) => (
          <div key={errorType} className="error-type">
            <h4>{errorType} ({errors.length})</h4>
            <ul className="error-list">
              {errors.slice(0, 5).map((error, index) => (
                <li key={index}>
                  Row {error.rowIndex + 1}, Column "{error.column}"
                </li>
              ))}
              {errors.length > 5 && (
                <li className="more-errors">
                  ...and {errors.length - 5} more
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValidationSummary; 