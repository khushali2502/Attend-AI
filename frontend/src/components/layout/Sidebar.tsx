'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  LayoutDashboard,
  Calendar,
  Video,
  ClipboardCheck,
  FileText,
  Settings,
  Users,
  Monitor,
  BookOpen,
  Clock,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Shield,
  User,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  if (!user) return null;

  const role = user.role;

  // Sidebar Links based on Roles
  const studentLinks = [
    { name: 'Dashboard', path: '/student', icon: LayoutDashboard },
    { name: 'My Attendance', path: '/student/attendance', icon: ClipboardCheck },
    { name: 'Timetable', path: '/student/timetable', icon: Clock },
    { name: 'Calendar', path: '/student/calendar', icon: Calendar },
    { name: 'Report', path: '/student/report', icon: FileText },
    { name: 'Profile', path: '/student/profile', icon: User },
    { name: 'Settings', path: '/student/settings', icon: Settings },
  ];

  const teacherLinks = [
    { name: 'Dashboard', path: '/teacher', icon: LayoutDashboard },
    { name: 'Live Surveillance', path: '/teacher/surveillance', icon: Video },
    { name: 'Verify Logs', path: '/teacher/verify', icon: ClipboardCheck },
    { name: 'Face Registry', path: '/teacher/registry', icon: Users },
    { name: 'Reports', path: '/teacher/reports', icon: FileText },
    { name: 'Settings', path: '/teacher/settings', icon: Settings },
  ];

  const adminLinks = [
    { name: 'Admin Hub', path: '/admin', icon: LayoutDashboard },
    { name: 'Manage Users', path: '/admin/users', icon: Users },
    { name: 'Manage Academic', path: '/admin/academic', icon: BookOpen },
    { name: 'Surveillance Feeds', path: '/admin/cameras', icon: Monitor },
    { name: 'Analytics', path: '/admin/analytics', icon: Activity },
    { name: 'Audit Logs', path: '/admin/logs', icon: Shield },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const links = role === 'student' ? studentLinks : role === 'teacher' ? teacherLinks : adminLinks;

  return (
    <aside
      className={`glass-panel h-screen fixed left-0 top-0 z-30 flex flex-col justify-between border-r transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand / Logo */}
      <div>
        <div className={`flex items-center justify-between p-4 border-b border-border`}>
          {!collapsed && (
            <Link href={`/${role}`} className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm shadow-md">
                A
              </span>
              <span className="gradient-text font-extrabold">AttendAI</span>
            </Link>
          )}
          {collapsed && (
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-10 h-10 rounded-lg flex items-center justify-center text-white text-md font-bold mx-auto shadow-md">
              AI
            </span>
          )}
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg border border-border bg-background/50 hover:bg-accent text-muted-foreground hover:text-foreground hidden md:block"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.path;
            return (
              <Link
                key={link.name}
                href={link.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/40 border border-transparent'
                }`}
              >
                <Icon
                  size={20}
                  className={`transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}
                />
                {!collapsed && <span>{link.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile and Settings */}
      <div className="p-3 border-t border-border space-y-3">
        {/* Quick action buttons */}
        <div className="flex items-center justify-around gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-all flex-1 flex justify-center border border-border bg-background/10"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button
            onClick={logout}
            className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-1 flex justify-center border border-border bg-background/10"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* User Card */}
        {!collapsed && (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-background/20 border border-border/50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-sm text-sm">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-semibold text-xs truncate">{user.name}</h4>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
