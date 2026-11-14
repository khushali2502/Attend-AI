'use client';

import React, { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Users,
  Search,
  Filter,
  FileDown,
  Upload,
  UserCheck,
  UserMinus,
  Settings,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  AlertCircle,
  Cpu,
  Clock,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<'surveillance' | 'records' | 'verification' | 'registration'>('surveillance');
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Hardware Status
  const [hardware, setHardware] = useState<any>(null);

  // Today's Sessions
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);

  // Uncertain Detections & Disputes
  const [uncertainQueue, setUncertainQueue] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);

  // Face Registration Form State
  const [regStudentId, setRegStudentId] = useState<number>(1);
  const [regPhoto, setRegPhoto] = useState<File | null>(null);
  const [regMessage, setRegMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Surveillance Stream States
  const [streaming, setStreaming] = useState(true);
  const [streamLogs, setStreamLogs] = useState<string[]>([]);
  const [surveillanceData, setSurveillanceData] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load baseline data
  useEffect(() => {
    async function loadData() {
      try {
        const [studentList, cameraList, hwData, sessionsData, uncData, dispData] = await Promise.all([
          api.getTeacherStudents().catch(() => []),
          api.getCameras().catch(() => []),
          api.getHardwareStatus().catch(() => null),
          api.getTodaySessions().catch(() => []),
          api.getUncertainQueue().catch(() => []),
          api.getDisputes().catch(() => [])
        ]);

        setStudents(studentList);
        setCameras(cameraList);
        setHardware(hwData);
        setTodaySessions(sessionsData);
        if (sessionsData.length > 0) {
          const current = sessionsData.find((s: any) => s.status === 'Active') || sessionsData[0];
          setActiveSession(current);
        }
        setUncertainQueue(uncData);
        setDisputes(dispData);

        // Load recent attendance logs
        const attLogs = await fetch('http://localhost:8000/api/attendance', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()).catch(() => []);
        setAttendance(attLogs);
      } catch (err) {
        console.error("Error loading teacher portal data", err);
      }
    }
    loadData();
  }, []);

  // WebSocket Surveillance Connection
  useEffect(() => {
    if (!streaming) {
      if (wsRef.current) wsRef.current.close();
      return;
    }

    const ws = new WebSocket(`ws://localhost:8000/api/ws/surveillance?camera_id=${selectedCamera}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setSurveillanceData(data);

        const newLogs: string[] = [];
        data.detections?.forEach((d: any) => {
          newLogs.push(`[${new Date().toLocaleTimeString()}] Confirmed: ${d.name} (${Math.round(d.confidence * 100)}%)`);
        });
        data.uncertain_events?.forEach((u: any) => {
          newLogs.push(`[${new Date().toLocaleTimeString()}] ❓ Borderline Match: ${u.predicted_name} (${Math.round(u.confidence * 100)}%) -> Sent to Review`);
        });
        data.unknown_persons?.forEach(() => {
          newLogs.push(`[${new Date().toLocaleTimeString()}] ⚠ Unregistered face in classroom.`);
        });
        setStreamLogs(prev => [...newLogs, ...prev].slice(0, 15));
      } catch (e) {
        // parse error ignore
      }
    };

    ws.onerror = () => {
      console.warn("WebSocket stream state updated.");
    };

    return () => {
      ws.close();
    };
  }, [streaming, selectedCamera]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !surveillanceData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Confirmed students (Green)
    surveillanceData.detections?.forEach((det: any) => {
      const [x, y, w, h] = det.box || [100, 100, 80, 80];
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(x - 1, y - 22, w + 2, 22);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.fillText(`${det.name} (${Math.round(det.confidence * 100)}%)`, x + 4, y - 6);
    });

    // Unknown persons (Red)
    surveillanceData.unknown_persons?.forEach((det: any) => {
      const [x, y, w, h] = det.box || [250, 120, 80, 80];
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fillRect(x - 1, y - 22, w + 2, 22);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Outfit, sans-serif';
      ctx.fillText(`UNREGISTERED PERSON`, x + 4, y - 7);
    });
  }, [surveillanceData]);

  const toggleAttendanceStatus = async (recordId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Present' ? 'Absent' : currentStatus === 'Absent' ? 'Late' : 'Present';
    try {
      await api.correctAttendance(recordId, nextStatus);
      setAttendance(prev => prev.map(a => a.id === recordId ? { ...a, status: nextStatus, verification_method: 'Manual_Teacher' } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewUncertain = async (id: number, status: 'Approved' | 'Rejected') => {
    try {
      await api.reviewUncertainDetection(id, status);
      setUncertainQueue(prev => prev.filter(u => u.id !== id));
      alert(`Detection ${status.toLowerCase()} successfully.`);
    } catch (e) {
      console.error(e);
      alert('Error updating uncertain detection.');
    }
  };

  const handleReviewDispute = async (id: number, status: 'Approved' | 'Rejected') => {
    try {
      await api.reviewDispute(id, status, 'Reviewed by faculty');
      setDisputes(prev => prev.map(d => d.id === id ? { ...d, status } : d));
      alert(`Dispute ${status.toLowerCase()} successfully.`);
    } catch (e) {
      console.error(e);
      alert('Error reviewing dispute.');
    }
  };

  const handleToggleSessionStatus = async (sessionId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Paused' : 'Active';
    try {
      const updated = await api.updateSessionStatus(sessionId, newStatus);
      setActiveSession(updated);
      setTodaySessions(prev => prev.map(s => s.id === sessionId ? updated : s));
    } catch (e) {
      console.error(e);
    }
  };

  const exportPDF = () => window.open('http://localhost:8000/api/reports/pdf', '_blank');
  const exportExcel = () => window.open('http://localhost:8000/api/reports/excel', '_blank');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Hardware Badge */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">Faculty Dashboard</h1>
              {hardware && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                  hardware.device_type === 'NPU' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                  hardware.device_type === 'GPU' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                  'bg-amber-500/10 text-amber-500 border-amber-500/30'
                }`}>
                  <Cpu size={13} /> {hardware.device_type} Active ({hardware.selected_provider})
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Lecture-wise surveillance, attendance verification, and student dispute resolution.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-background/50 border border-border/80 rounded-xl p-1 max-w-fit shadow-sm">
            {[
              { id: 'surveillance', label: 'Surveillance Hub', icon: Video },
              { id: 'records', label: 'Attendance Records', icon: Users },
              { id: 'verification', label: `Reviews & Disputes (${uncertainQueue.length + disputes.filter(d => d.status === 'Pending').length})`, icon: ShieldCheck },
              { id: 'registration', label: 'Face Registration', icon: UserCheck },
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

        {/* Active Lecture Session Banner */}
        {activeSession && (
          <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                <Clock size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-foreground">
                    {activeSession.subject?.name} ({activeSession.subject?.code})
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeSession.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse' :
                    'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    ● {activeSession.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Classroom: <span className="text-foreground font-semibold">{activeSession.classroom?.name || 'Room 302'}</span> • Scheduled: {activeSession.scheduled_start} - {activeSession.scheduled_end} • Intervals: {activeSession.total_eligible_intervals}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleSessionStatus(activeSession.id, activeSession.status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all ${
                  activeSession.status === 'Active' ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {activeSession.status === 'Active' ? <Pause size={14} /> : <Play size={14} />}
                {activeSession.status === 'Active' ? 'Pause Surveillance' : 'Start Surveillance'}
              </button>
            </div>
          </div>
        )}

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          {activeTab === 'surveillance' && (
            <motion.div
              key="surveillance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Camera Feed Canvas */}
              <Card className="lg:col-span-2 border border-border/40 overflow-hidden flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border mb-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-ping"></span>
                    <CardTitle className="text-md font-bold">Classroom CCTV / IP Camera Stream</CardTitle>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedCamera}
                      onChange={(e) => setSelectedCamera(Number(e.target.value))}
                      className="px-2.5 py-1 text-xs border border-border rounded-lg bg-background text-foreground outline-none"
                    >
                      {cameras.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setStreaming(!streaming)}
                      className={`p-1.5 rounded-lg border border-border ${streaming ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`}
                      title={streaming ? 'Pause stream' : 'Resume stream'}
                    >
                      {streaming ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                  </div>
                </CardHeader>
                <div className="bg-[#0b0f19] p-4 flex items-center justify-center border-b border-border">
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={380}
                    className="rounded-xl border border-border/60 shadow-inner w-full max-w-[640px] aspect-[16/10]"
                  />
                </div>
                <div className="p-3 bg-card/60 flex items-center justify-between text-xs text-muted-foreground px-4">
                  <div className="flex items-center gap-4">
                    <span>Engine: <b>SCRFD + ArcFace</b></span>
                    <span>Liveness: <b>MiniFASNet</b></span>
                  </div>
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle size={13} /> Real-Time Telemetry Active
                  </span>
                </div>
              </Card>

              {/* Feed logs */}
              <Card className="lg:col-span-1 border border-border/40 flex flex-col h-[500px]">
                <CardHeader className="p-4 border-b border-border mb-0">
                  <CardTitle className="text-md">AI Observation Telemetry</CardTitle>
                  <CardDescription>Raw facial recognition events & unknown alerts</CardDescription>
                </CardHeader>
                <CardContent className="p-3 overflow-y-auto flex-1 font-mono text-[10px] space-y-2 bg-background/25">
                  {streamLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border transition-all ${
                        log.includes('WARNING') || log.includes('Unregistered')
                          ? 'bg-destructive/10 border-destructive/20 text-destructive'
                          : log.includes('Borderline')
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          : 'bg-accent/40 border-border text-muted-foreground'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                  {streamLogs.length === 0 && (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-center">
                      Awaiting frames from SCRFD face detector...
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Pending Reviews & Disputes Tab */}
          {activeTab === 'verification' && (
            <motion.div
              key="verification"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Uncertain Detections Review Queue */}
              <Card className="border border-border/40">
                <CardHeader>
                  <CardTitle>Borderline Detections Review Queue (0.40 - 0.54 Similarity)</CardTitle>
                  <CardDescription>
                    These student faces were observed at distance or angled positions. Confirm or reject to credit their lecture presence.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-border bg-accent/20 text-muted-foreground text-xs uppercase font-semibold">
                        <th className="p-4">Face Crop</th>
                        <th className="p-4">Suggested Student</th>
                        <th className="p-4">Similarity Score</th>
                        <th className="p-4">Timestamp</th>
                        <th className="p-4 text-right">Verification Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {uncertainQueue.map((unc) => (
                        <tr key={unc.id} className="hover:bg-accent/20">
                          <td className="p-4">
                            <img
                              src={`http://localhost:8000${unc.crop_image_path}`}
                              alt="Crop"
                              className="w-12 h-12 rounded-lg object-cover border border-border"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          </td>
                          <td className="p-4 font-bold text-foreground">
                            {unc.student?.user?.name || `Student #${unc.predicted_student_id}`}
                            <span className="block text-xs font-normal text-muted-foreground">Roll: {unc.student?.roll_number}</span>
                          </td>
                          <td className="p-4 font-bold text-amber-500">
                            {Math.round(unc.confidence_score * 100)}% Match
                          </td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {new Date(unc.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleReviewUncertain(unc.id, 'Approved')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20"
                            >
                              Confirm Present
                            </button>
                            <button
                              onClick={() => handleReviewUncertain(unc.id, 'Rejected')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border border-destructive/20"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                      {uncertainQueue.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">
                            No borderline detections awaiting verification.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Student Attendance Disputes Inbox */}
              <Card className="border border-border/40">
                <CardHeader>
                  <CardTitle>Student Attendance Disputes & Correction Requests</CardTitle>
                  <CardDescription>
                    Official disputes filed by students contesting absent marks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-border bg-accent/20 text-muted-foreground text-xs uppercase font-semibold">
                        <th className="p-4">Student</th>
                        <th className="p-4">Dispute Reason</th>
                        <th className="p-4">Date Filed</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Faculty Resolution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {disputes.map((d) => (
                        <tr key={d.id} className="hover:bg-accent/20">
                          <td className="p-4 font-bold text-foreground">
                            {d.student?.user?.name}
                            <span className="block text-xs font-normal text-muted-foreground">Roll: {d.student?.roll_number}</span>
                          </td>
                          <td className="p-4 text-xs text-foreground max-w-xs">{d.reason}</td>
                          <td className="p-4 text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                              d.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {d.status === 'Pending' ? (
                              <>
                                <button
                                  onClick={() => handleReviewDispute(d.id, 'Approved')}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600"
                                >
                                  Approve & Mark Present
                                </button>
                                <button
                                  onClick={() => handleReviewDispute(d.id, 'Rejected')}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
                                >
                                  Decline
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground font-semibold">Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {disputes.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">
                            No pending attendance disputes filed.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Attendance Records Tab */}
          {activeTab === 'records' && (
            <motion.div
              key="records"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <Card className="border border-border/40 p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search student or roll number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-border rounded-xl bg-background text-sm outline-none"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-border rounded-xl bg-background text-sm outline-none"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Late">Late</option>
                    </select>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto justify-end">
                    <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 border border-border bg-card hover:bg-accent rounded-xl text-xs font-bold">
                      <FileDown size={14} /> PDF Sheet
                    </button>
                    <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 border border-border bg-card hover:bg-accent rounded-xl text-xs font-bold">
                      <FileDown size={14} /> Excel Export
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="border border-border/40">
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-border bg-accent/20 text-muted-foreground text-xs uppercase font-semibold">
                        <th className="p-4">Roll Number</th>
                        <th className="p-4">Student Name</th>
                        <th className="p-4">Observed Intervals</th>
                        <th className="p-4">Method</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Manual Toggle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {attendance
                        .filter(a => {
                          const name = a.student?.user?.name || '';
                          const roll = a.student?.roll_number || '';
                          const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            roll.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
                          return matchesSearch && matchesStatus;
                        })
                        .map((a) => (
                          <tr key={a.id} className="hover:bg-accent/20">
                            <td className="p-4 font-bold text-foreground">{a.student?.roll_number}</td>
                            <td className="p-4 font-semibold text-foreground">{a.student?.user?.name}</td>
                            <td className="p-4 text-muted-foreground">{a.intervals_observed || 0}/{a.total_eligible_intervals || 10}</td>
                            <td className="p-4 text-xs text-muted-foreground">{a.verification_method}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                a.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500' :
                                a.status === 'Late' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => toggleAttendanceStatus(a.id, a.status)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-accent hover:bg-accent/80 border border-border"
                              >
                                Toggle (Next)
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Registration Tab */}
          {activeTab === 'registration' && (
            <motion.div
              key="registration"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border border-border/40 max-w-xl mx-auto p-6 space-y-4">
                <CardHeader className="p-0 mb-4">
                  <CardTitle>Biometric Face Enrollment Gate</CardTitle>
                  <CardDescription>
                    Registers student face embeddings into PostgreSQL with Laplacian blur check and duplicate detection.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!regPhoto) return;
                  setIsRegistering(true);
                  try {
                    await api.registerStudentFace(regStudentId, regPhoto);
                    setRegMessage('Student face successfully enrolled and templates computed.');
                  } catch (err: any) {
                    setRegMessage(err.message || 'Error uploading face.');
                  } finally {
                    setIsRegistering(false);
                  }
                }} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Select Student</label>
                    <select
                      value={regStudentId}
                      onChange={(e) => setRegStudentId(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-border bg-background text-sm"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.user?.name} ({s.roll_number})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Upload Face Portrait</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setRegPhoto(e.target.files?.[0] || null)}
                      className="w-full text-xs"
                    />
                  </div>
                  {regMessage && (
                    <div className="p-3 rounded-xl bg-accent text-xs font-medium">{regMessage}</div>
                  )}
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow hover:bg-primary/90"
                  >
                    {isRegistering ? 'Processing Biometrics...' : 'Enroll Face Profile'}
                  </button>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
