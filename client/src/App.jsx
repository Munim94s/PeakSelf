import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Blog from './pages/Blog';
import Post from './pages/Post';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import CheckEmail from './pages/CheckEmail';
import Admin from './pages/Admin';
import NotAccessible from './pages/NotAccessible';
import RateLimit from './pages/RateLimit';
import Tracker from './components/Tracker';
import './App.css';

function App() {
  const location = useLocation();
  const hideFooter = location.pathname.startsWith('/admin');
  return (
    <div className="app">
      <Header />
      <Tracker />
      <main>
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
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}

export default App;
