import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, endpoints, response } from '../api';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      await apiClient.post(endpoints.auth.register, { name, email, password });
      // Redirect to check-email page with the email address
      navigate(`/check-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setMsg(response.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const googleRegister = () => {
    window.location.href = endpoints.auth.googleAuth;
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="hero-section">
        <div className="container">
          <div className="py-16">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center md:text-left">
                <h1 className="hero-title md:text-5xl">Join Peakium</h1>
                <p className="hero-subtitle" style={{ margin: '0 auto 1.5rem auto' }}>Start your journey to peak performance. Create insights that matter.</p>
                <div className="bg-white text-gray-700 rounded-lg shadow p-4 inline-block">
                  <span className="font-semibold">Welcome!</span> We'll email you a verification link to confirm your account.
                </div>
              </div>
              <div>
                <div className="bg-white rounded-3xl p-8 shadow-2xl border-0 backdrop-blur-sm" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.3)' }}>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                      P
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Create account</h2>
                    <p className="text-gray-600 text-base">Join Peakium in seconds</p>
                  </div>

                  <div className="space-y-6">
                    <button
                      onClick={googleRegister}
                      className="w-full bg-white border-2 border-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center justify-center space-x-3 shadow-sm"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>Continue with Google</span>
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500 font-medium">or create account with email</span>
                      </div>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-5">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Full name</label>
                          <input
                            type="text"
                            className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 text-base bg-white shadow-sm"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                          <input
                            type="email"
                            className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 text-base bg-white shadow-sm"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                          <input
                            type="password"
                            className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 text-base bg-white shadow-sm"
                            placeholder="Create a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <p className="text-xs text-gray-500 mt-2">Use at least 8 characters with letters, numbers & symbols</p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full bg-black text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-800 focus:ring-4 focus:ring-black focus:ring-opacity-50 transition-all duration-200 text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          disabled={loading}
                          aria-busy={loading}
                        >
                          {loading ? 'Creating...' : 'Create account'}
                        </button>
                      </div>
                    </form>

                    <div className="text-center pt-4 border-t border-gray-100">
                      <p className="text-gray-600">
                        Already have an account?{' '}
                        <a href="/login" className="font-semibold text-black hover:text-gray-700 transition-colors duration-200">
                          Sign in
                        </a>
                      </p>
                    </div>
                  </div>

                  {msg && (
                    <div className={`mt-4 p-4 rounded-xl text-center text-sm font-medium ${msg.includes('Check your email')
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                      {msg}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

