import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Tracker from './components/Tracker';
import EngagementTracker from './components/EngagementTracker';
import BrandedLoadingScreen from './components/BrandedLoadingScreen';
import { ModalProvider } from './contexts/ModalContext';
import SitePrefsBanner from './components/SitePrefsBanner';
import './App.css';
// Lazy load all pages
const Home = lazy(() => import('./pages/Home'));
const Blog = lazy(() => import('./pages/Blog'));
const Post = lazy(() => import('./pages/Post'));
const NichePage = lazy(() => import('./pages/NichePage'));
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
  
  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return (
    <ModalProvider>
      <div className="app">
        <Header />
        <Tracker />
        <EngagementTracker />
          <Suspense fallback={<BrandedLoadingScreen />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<Post />} />
              <Route path="/:nicheSlug/blog" element={<Blog />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/check-email" element={<CheckEmail />} />
              <Route path="/rate-limit" element={<RateLimit />} />
              <Route path="/admin/*" element={<Admin />} />
              <Route path="/not-accessible" element={<NotAccessible />} />
              <Route path="/:nicheSlug" element={<NichePage />} />
            </Routes>
          </Suspense>
        {!hideFooter && <Footer />}
        {!hideFooter && <SitePrefsBanner />}
      </div>
    </ModalProvider>
  );
}

export default App;
