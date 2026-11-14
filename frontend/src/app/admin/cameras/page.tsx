'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/utils/api';
import { Plus, Monitor, Activity, Radio, Wifi, WifiOff } from 'lucide-react';

export default function AdminCamerasPage() {
  const [cameras, setCameras] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [newCamName, setNewCamName] = useState('');
  const [newCamLoc, setNewCamLoc] = useState('');
  const [newCamRtsp, setNewCamRtsp] = useState('');
  const [newCamRoomId, setNewCamRoomId] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getCameras().catch(() => []),
      api.getClassrooms().catch(() => [])
    ]).then(([cams, rooms]) => {
      setCameras(cams);
      setClassrooms(rooms);
      if (rooms.length > 0) setNewCamRoomId(rooms[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamName || !newCamLoc) return;
    try {
      const added = await api.createCamera(newCamName, newCamLoc, newCamRtsp, 'Online');
      setCameras(prev => [...prev, added]);
      setNewCamName('');
      setNewCamLoc('');
      setNewCamRtsp('');
    } catch (err: any) {
      alert(err.message || 'Error adding camera');
    }
  };

  const handleToggleCamera = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Online' || currentStatus === 'Active' ? 'Offline' : 'Online';
    await api.updateCamera(id, nextStatus);
    setCameras(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Camera Feed Registry & Health Monitor (IoT)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure classroom CCTV / IP RTSP cameras with live heartbeat, FPS, and inference latency telemetry.
          </p>
        </div>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle className="text-md flex items-center gap-2">
              <Radio size={16} className="text-primary animate-pulse" /> Add Classroom Camera / RTSP Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCamera} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 items-end">
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Camera Name</label>
                <input
                  type="text"
                  placeholder="e.g. Room 302 Ceiling CCTV"
                  value={newCamName}
                  onChange={(e) => setNewCamName(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background text-xs rounded-xl outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Block A, Room 302"
                  value={newCamLoc}
                  onChange={(e) => setNewCamLoc(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background text-xs rounded-xl outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Classroom</label>
                <select
                  value={newCamRoomId}
                  onChange={(e) => setNewCamRoomId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border bg-background text-xs rounded-xl outline-none"
                >
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">RTSP Stream URL</label>
                <input
                  type="text"
                  placeholder="rtsp://admin:pass@192.168.1.50/stream1"
                  value={newCamRtsp}
                  onChange={(e) => setNewCamRtsp(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background text-xs rounded-xl outline-none"
                />
              </div>
              <button type="submit" className="py-2 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 shadow">
                <Plus size={14} /> Add Stream
              </button>
            </form>

            {loading ? (
              <div className="h-24 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-accent/20 border-b border-border text-muted-foreground font-semibold uppercase">
                      <th className="p-3">Device / Camera</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">RTSP Stream URL</th>
                      <th className="p-3">Stream Telemetry</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {cameras.map(c => {
                      const isOnline = c.status === 'Online' || c.status === 'Active';
                      return (
                        <tr key={c.id} className="hover:bg-accent/10">
                          <td className="p-3 font-bold text-foreground flex items-center gap-2">
                            {isOnline ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-muted-foreground" />}
                            {c.name}
                          </td>
                          <td className="p-3 text-muted-foreground">{c.location}</td>
                          <td className="p-3 font-mono text-muted-foreground max-w-xs truncate">{c.rtsp_url || 'Laptop Webcam Mode'}</td>
                          <td className="p-3 text-muted-foreground font-mono">
                            {c.fps ? `${c.fps} FPS` : '—'} • {c.inference_latency_ms ? `${c.inference_latency_ms}ms latency` : 'Active'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isOnline ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                              ● {c.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleToggleCamera(c.id, c.status)}
                              className="px-2.5 py-1 bg-accent hover:bg-accent/80 border border-border rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground"
                            >
                              Toggle Status
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
