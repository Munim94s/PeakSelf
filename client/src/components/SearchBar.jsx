import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import './SearchBar.css';

const SearchBar = ({ onSearch, placeholder = "Search articles..." }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize event handlers to prevent unnecessary re-renders
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSearch(searchTerm);
  }, [searchTerm, onSearch]);

  const handleClear = useCallback(() => {
    setSearchTerm('');
    onSearch('');
  }, [onSearch]);

  return (
    <form onSubmit={handleSubmit} className="search-bar-form">
      <div className="search-bar-container">
        <div className="search-bar-icon-container">
          <Search className="search-bar-icon" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar-input"
          placeholder={placeholder}
        />
        {searchTerm && (
          <div className="search-bar-clear-container">
            <button
              type="button"
              onClick={handleClear}
              className="search-bar-clear-btn"
            >
              <X className="search-bar-clear-icon" />
            </button>
          </div>
        )}
      </div>
    </form>
  );
};

// Memoize SearchBar to prevent re-renders when parent re-renders
export default React.memo(SearchBar);


