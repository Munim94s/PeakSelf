import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Tracker from './components/Tracker';
import './App.css';

// Eagerly load only the home page (most common entry point)
import Home from './pages/Home';

// Lazy load all other pages
const Blog = lazy(() => import('./pages/Blog'));
const Post = lazy(() => import('./pages/Post'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const CheckEmail = lazy(() => import('./pages/CheckEmail'));
const Admin = lazy(() => import('./pages/Admin'));
const NotAccessible = lazy(() => import('./pages/NotAccessible'));
const RateLimit = lazy(() => import('./pages/RateLimit'));

// Loading fallback component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    fontSize: '1.2rem',
    color: '#666'
  }}>
    <div>
      <div style={{ marginBottom: '1rem', textAlign: 'center' }}>Loading...</div>
      <div style={{
        width: '50px',
        height: '50px',
        border: '3px solid #f3f3f3',
        borderTop: '3px solid #3498db',
        borderRadius: '50%',
        margin: '0 auto',
        animation: 'spin 1s linear infinite'
      }} />
    </div>
  </div>
);

function App() {
  const location = useLocation();
  const hideFooter = location.pathname.startsWith('/admin');
  
  return (
    <div className="app">
      <Header />
      <Tracker />
      <main>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<Post />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/rate-limit" element={<RateLimit />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/not-accessible" element={<NotAccessible />} />
          </Routes>
        </Suspense>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}

export default App;
