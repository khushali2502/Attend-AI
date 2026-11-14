'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Users,
  BookOpen,
  Monitor,
  Database,
  Terminal,
  Activity,
  Plus,
  Trash2,
  Settings,
  Server,
  Globe,
  Lock
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'academic' | 'hardware' | 'audit'>('analytics');
  const [stats, setStats] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms states
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjDeptId, setNewSubjDeptId] = useState<number>(1);
  const [newCamName, setNewCamName] = useState('');
  const [newCamLoc, setNewCamLoc] = useState('');
  const [newCamRtsp, setNewCamRtsp] = useState('');

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [statsData, deptData, subjData, camData, logsData] = await Promise.all([
          api.getAdminStats(),
          api.getDepartments(),
          api.getSubjects(),
          api.getCameras(),
          api.getAuditLogs()
        ]);
        setStats(statsData);
        setDepartments(deptData);
        setSubjects(subjData);
        setCameras(camData);
        setAuditLogs(logsData);
      } catch (err) {
        console.error("Error loading admin data", err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName || !newDeptCode) return;
    const added = await api.createDepartment(newDeptName, newDeptCode);
    setDepartments(prev => [...prev, added]);
    setNewDeptName('');
    setNewDeptCode('');
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName || !newSubjCode) return;
    const added = await api.createSubject(newSubjName, newSubjCode, newSubjDeptId);
    // Find department name for local list update
    const dept = departments.find(d => d.id === newSubjDeptId);
    setSubjects(prev => [...prev, { ...added, department: { code: dept?.code || 'CSE' } }]);
    setNewSubjName('');
    setNewSubjCode('');
  };

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamName || !newCamLoc) return;
    const added = await api.createCamera(newCamName, newCamLoc, newCamRtsp);
    setCameras(prev => [...prev, added]);
    setNewCamName('');
    setNewCamLoc('');
    setNewCamRtsp('');
  };

  const handleToggleCamera = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const updated = await api.updateCamera(id, nextStatus);
    setCameras(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // System usage analytics (charts data)
  const systemMetrics = [
    { name: '09:00', CPU: 42, Memory: 60, Network: 120 },
    { name: '10:00', CPU: 78, Memory: 62, Network: 340 },
    { name: '11:00', CPU: 52, Memory: 65, Network: 280 },
    { name: '12:00', CPU: 38, Memory: 61, Network: 190 },
    { name: '13:00', CPU: 89, Memory: 75, Network: 410 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Admin Command Center</h1>
            <p className="text-muted-foreground text-sm mt-1">
              System performance metrics, user profiles, hardware controls, and audit logs.
            </p>
          </div>
          <div className="flex bg-background/50 border border-border rounded-xl p-1 shadow-sm max-w-fit">
            {[
              { id: 'analytics', label: 'Analytics', icon: Activity },
              { id: 'academic', label: 'Academic Hierarchy', icon: BookOpen },
              { id: 'hardware', label: 'Cameras (IoT)', icon: Monitor },
              { id: 'audit', label: 'Security Log', icon: Terminal },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-tr from-blue-600/20 to-purple-600/20 border border-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/40 border border-transparent'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border border-border/40 p-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2 mb-0">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Students</CardDescription>
              <Users size={16} className="text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold">{stats?.students}</div>
              <p className="text-[10px] text-success mt-1">{stats?.face_registered} biometric profiles</p>
            </CardContent>
          </Card>

          <Card className="border border-border/40 p-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2 mb-0">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Faculty Members</CardDescription>
              <Users size={16} className="text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold">{stats?.teachers}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Role-based controls</p>
            </CardContent>
          </Card>

          <Card className="border border-border/40 p-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2 mb-0">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AI Feeds Online</CardDescription>
              <Monitor size={16} className="text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-success">{stats?.active_cameras} / {stats?.cameras}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Live RTSP streams</p>
            </CardContent>
          </Card>

          <Card className="border border-border/40 p-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2 mb-0">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Departments</CardDescription>
              <BookOpen size={16} className="text-tertiary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold">{stats?.departments}</div>
              <p className="text-[10px] text-muted-foreground mt-1">{stats?.subjects} courses enrolled</p>
            </CardContent>
          </Card>

          <Card className="border border-border/40 p-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2 mb-0">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Server State</CardDescription>
              <Server size={16} className="text-success animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold">Online</div>
              <p className="text-[10px] text-muted-foreground mt-1">Ping: 8ms | CPU: 18%</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Views */}
        <AnimatePresence mode="wait">
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 gap-6"
            >
              {/* Server GPU/CPU Analytics chart */}
              <Card className="border border-border/40">
                <CardHeader>
                  <CardTitle>System Performance & API Network Load</CardTitle>
                  <CardDescription>Real-time server latency, database queues, and YOLO model performance loads.</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={systemMetrics}>
                      <defs>
                        <linearGradient id="colorCPU" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                      <YAxis stroke="#64748B" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Area type="monotone" dataKey="CPU" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCPU)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Network" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorNet)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'academic' && (
            <motion.div
              key="academic"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Departments column */}
              <div className="space-y-4">
                <Card className="border border-border/40">
                  <CardHeader>
                    <CardTitle>Departments</CardTitle>
                    <CardDescription>Setup academic wings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddDept} className="flex gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="Name (e.g. Electrical Eng.)"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-border rounded-xl bg-background/50 text-xs outline-none focus:border-primary"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Code (e.g. EE)"
                        value={newDeptCode}
                        onChange={(e) => setNewDeptCode(e.target.value)}
                        className="w-20 px-3 py-2 border border-border rounded-xl bg-background/50 text-xs outline-none focus:border-primary"
                        required
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1 shadow-md hover:bg-primary/95 transition-all"
                      >
                        <Plus size={14} /> Add
                      </button>
                    </form>
                    <div className="border border-border rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-accent/20 border-b border-border text-muted-foreground font-semibold">
                            <th className="p-3">ID</th>
                            <th className="p-3">Department Name</th>
                            <th className="p-3">Code</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {departments.map(d => (
                            <tr key={d.id} className="hover:bg-accent/10">
                              <td className="p-3 font-mono text-muted-foreground">{Math.round(d.id)}</td>
                              <td className="p-3 font-bold">{d.name}</td>
                              <td className="p-3 font-semibold text-primary">{d.code}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Subjects column */}
              <div className="space-y-4">
                <Card className="border border-border/40">
                  <CardHeader>
                    <CardTitle>Courses / Subjects</CardTitle>
                    <CardDescription>Setup subjects linked to departments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddSubject} className="space-y-3 mb-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Subject Name (e.g. Control Systems)"
                          value={newSubjName}
                          onChange={(e) => setNewSubjName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-border rounded-xl bg-background/50 text-xs outline-none focus:border-primary"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Code (EE301)"
                          value={newSubjCode}
                          onChange={(e) => setNewSubjCode(e.target.value)}
                          className="w-24 px-3 py-2 border border-border rounded-xl bg-background/50 text-xs outline-none focus:border-primary"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={newSubjDeptId}
                          onChange={(e) => setNewSubjDeptId(Number(e.target.value))}
                          className="flex-1 px-3 py-2 border border-border rounded-xl bg-background/50 text-xs outline-none text-muted-foreground"
                        >
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1 shadow-md hover:bg-primary/95 transition-all"
                        >
                          <Plus size={14} /> Add Course
                        </button>
                      </div>
                    </form>
                    <div className="border border-border rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-accent/20 border-b border-border text-muted-foreground font-semibold">
                            <th className="p-3">Code</th>
                            <th className="p-3">Course Title</th>
                            <th className="p-3">Dept</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {subjects.map(s => (
                            <tr key={s.id} className="hover:bg-accent/10">
                              <td className="p-3 font-mono font-bold text-muted-foreground">{s.code}</td>
                              <td className="p-3 font-semibold">{s.name}</td>
                              <td className="p-3 font-semibold text-primary">{s.department?.code || 'CSE'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'hardware' && (
            <motion.div
              key="hardware"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Card className="border border-border/40">
                <CardHeader>
                  <CardTitle>AI IoT surveillance Cameras</CardTitle>
                  <CardDescription>Setup and monitor hardware classroom cameras</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCamera} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 items-end">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1.5">Camera Name</label>
                      <input
                        type="text"
                        placeholder="Classroom 302 Main"
                        value={newCamName}
                        onChange={(e) => setNewCamName(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-background/50 text-xs rounded-xl outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1.5">Location</label>
                      <input
                        type="text"
                        placeholder="Building A, Floor 3"
                        value={newCamLoc}
                        onChange={(e) => setNewCamLoc(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-background/50 text-xs rounded-xl outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1.5">RTSP Stream URL</label>
                      <input
                        type="text"
                        placeholder="rtsp://192.168.1.50/stream1"
                        value={newCamRtsp}
                        onChange={(e) => setNewCamRtsp(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-background/50 text-xs rounded-xl outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="py-2 px-4 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                    >
                      <Plus size={14} /> Add Device
                    </button>
                  </form>

                  <div className="border border-border rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-accent/20 border-b border-border text-muted-foreground font-semibold">
                          <th className="p-3">Camera Name</th>
                          <th className="p-3">Location</th>
                          <th className="p-3">RTSP Stream Address</th>
                          <th className="p-3">Last Active</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {cameras.map(c => (
                          <tr key={c.id} className="hover:bg-accent/10">
                            <td className="p-3 font-bold">{c.name}</td>
                            <td className="p-3 text-muted-foreground">{c.location}</td>
                            <td className="p-3 font-mono text-muted-foreground">{c.rtsp_url || '—'}</td>
                            <td className="p-3 text-muted-foreground">{new Date(c.last_active).toLocaleString()}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'Active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleToggleCamera(c.id, c.status)}
                                className="px-2.5 py-1 bg-background/50 hover:bg-accent border border-border rounded-lg text-[10px] font-bold transition-all text-muted-foreground hover:text-foreground"
                              >
                                Toggle State
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <Card className="border border-border/40">
                <CardHeader className="p-4 border-b border-border mb-0">
                  <CardTitle className="text-md">Security Audit Logs</CardTitle>
                  <CardDescription>Comprehensive tracking logs of database events, overrides, and administrative operations.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-accent/20 border-b border-border text-muted-foreground font-semibold">
                        <th className="p-3.5">Action Logged</th>
                        <th className="p-3.5">Description Details</th>
                        <th className="p-3.5">IP Address</th>
                        <th className="p-3.5">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-accent/10 transition-all font-mono">
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3.5 text-muted-foreground font-sans font-semibold">{log.details}</td>
                          <td className="p-3.5 text-muted-foreground">{log.ip_address}</td>
                          <td className="p-3.5 text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
