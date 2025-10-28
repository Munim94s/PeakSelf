import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Tracker from './components/Tracker';
import LoadingSpinner from './components/LoadingSpinner';
import BrandedLoadingScreen from './components/BrandedLoadingScreen';
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

function App() {
  const location = useLocation();
  const hideFooter = location.pathname.startsWith('/admin');
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  return (
    <div className="app">
      <Header />
      <Tracker />
      <main>
        <Suspense fallback={isAdminRoute ? <BrandedLoadingScreen /> : <LoadingSpinner />}>
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
