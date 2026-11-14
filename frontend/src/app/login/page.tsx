'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { ShieldCheck, User, Users, ShieldAlert } from 'lucide-react';
import { api } from '@/utils/api';

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('arjun@attendai.com');
  const [password, setPassword] = useState('student123');
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('expired=1')) {
      setError('Your session has expired. Please log in again to continue.');
    }
  }, []);

  const prefillCredentials = (selectedRole: 'student' | 'teacher' | 'admin') => {
    setRole(selectedRole);
    if (selectedRole === 'student') {
      setIdentifier('24101B2010');
      setPassword('student123');
    } else if (selectedRole === 'teacher') {
      setIdentifier('teacher@attendai.com');
      setPassword('teacher123');
    } else {
      setIdentifier('admin@attendai.com');
      setPassword('admin123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(identifier, password);
      login(identifier, data.role as any, data.user_name, data.access_token);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06080F] relative overflow-hidden px-4">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Card className="glass-panel border-border/60">
          <CardHeader className="text-center">
            <div className="mx-auto bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/20 mb-3">
              A
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              Welcome to <span className="gradient-text">AttendAI</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              AI-Based surveillance platform for classroom teaching.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role Select Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[
                { type: 'student', label: 'Student', icon: User },
                { type: 'teacher', label: 'Teacher', icon: Users },
                { type: 'admin', label: 'Admin', icon: ShieldAlert },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = role === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => prefillCredentials(item.type as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-gradient-to-tr from-blue-600/20 to-purple-600/20 border-primary text-primary shadow-sm shadow-primary/10'
                        : 'border-border bg-background/20 text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    }`}
                  >
                    <Icon size={16} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {role === 'student' ? 'Email or Roll Number' : 'Email Address'}
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder={role === 'student' ? 'student@attendai.com or ROLL123' : 'name@university.edu'}
                  className="w-full px-4 py-3 glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 glass-input text-sm"
                />
              </div>

              {error && <p className="text-destructive text-xs font-semibold">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all transform active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In to Platform'}
              </button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
