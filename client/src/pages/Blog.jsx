import React, { useState, useMemo, useCallback } from 'react';
import { blogPosts, categories } from '../data/blogPosts';
import PostList from '../components/PostList';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import './Blog.css';

const Blog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const filteredPosts = useMemo(() => {
    let filtered = blogPosts;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    return filtered;
  }, [searchTerm, selectedCategory]);

  // Memoize the separation of featured and regular posts
  const { featuredPost, regularPosts } = useMemo(() => ({
    featuredPost: filteredPosts.find(post => post.featured),
    regularPosts: filteredPosts.filter(post => !post.featured)
  }), [filteredPosts]);

  // Memoize event handlers to prevent SearchBar re-renders
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('');
  }, []);

  return (
    <div className="blog-container">
      <div className="blog-content-wrapper">
        {/* Header */}
        <div className="blog-header">
          <h1 className="blog-title">
            Blog
          </h1>
          <p className="blog-subtitle">
            Explore our collection of articles covering technology, personal growth, 
            productivity, and lifestyle topics to help you reach your peak potential.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="blog-filters">
          <div className="blog-search-container">
            <SearchBar 
              onSearch={handleSearch}
              placeholder="Search articles, tags, or topics..."
            />
          </div>
          
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
        </div>

        {/* Results Count */}
        <div className="blog-results-count">
          <p>
            {filteredPosts.length === 0 
              ? 'No articles found' 
              : `Showing ${filteredPosts.length} article${filteredPosts.length !== 1 ? 's' : ''}`
            }
            {searchTerm && ` for "${searchTerm}"`}
            {selectedCategory && ` in ${selectedCategory}`}
          </p>
        </div>

        {/* Posts */}
        <PostList posts={regularPosts} featuredPost={featuredPost} />

        {/* No Results Message */}
        {filteredPosts.length === 0 && (
          <div className="blog-no-results">
            <div className="blog-no-results-title">No articles found</div>
            <p className="blog-no-results-subtitle">
              Try adjusting your search terms or browse different categories
            </p>
            <button
              onClick={handleClearFilters}
              className="blog-clear-filters-btn"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;


