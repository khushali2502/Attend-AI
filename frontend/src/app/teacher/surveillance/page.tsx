'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/utils/api';
import {
  Video,
  Pause,
  Play,
  CheckCircle,
  AlertCircle,
  Camera,
  Laptop,
  RefreshCw,
  ShieldCheck,
  Users,
  Activity,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

interface CameraSource {
  id: string;
  camera_id?: number;
  name: string;
  type: 'webcam' | 'ip_camera';
  location: string;
  status: string;
  is_default?: boolean;
}

export default function TeacherSurveillancePage() {
  const [sources, setSources] = useState<CameraSource[]>([
    {
      id: 'webcam',
      name: 'Laptop Webcam',
      type: 'webcam',
      location: 'Local Laptop / USB Camera',
      status: 'Active',
      is_default: true
    }
  ]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('webcam');
  const [streaming, setStreaming] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string>('');
  const [streamLogs, setStreamLogs] = useState<string[]>([]);
  const [surveillanceData, setSurveillanceData] = useState<any>(null);
  const [isProcessingFrame, setIsProcessingFrame] = useState<boolean>(false);
  const [webcamReady, setWebcamReady] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const latestDetectionsRef = useRef<any>(null);

  // Load available camera sources (Laptop Webcam + physical CCTV cameras)
  const loadCameraSources = async () => {
    try {
      const data = await api.getCameraSources();
      if (data && data.length > 0) {
        setSources(data);
      }
    } catch (err) {
      console.warn('Using default webcam camera source', err);
    }
  };

  useEffect(() => {
    loadCameraSources();
  }, []);

  const currentSource = sources.find(s => s.id === selectedSourceId) || sources[0];
  const isWebcamMode = currentSource?.type === 'webcam' || selectedSourceId === 'webcam';

  // Stop active media stream tracks
  const stopWebcam = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track', e);
        }
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamReady(false);
  }, []);

  // Initialize browser webcam stream
  const startWebcam = useCallback(async () => {
    stopWebcam();
    setCameraError('');
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Your browser does not support webcam mediaDevices API.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
          setWebcamReady(true);
        };
      }
    } catch (err: any) {
      console.error('Camera permission or access error:', err);
      let msg = 'Camera permission denied or camera unavailable. Please allow camera access in your browser settings.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera access in your browser to enable live surveillance.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No webcam detected. Please plug in a USB camera or verify device settings.';
      }
      setCameraError(msg);
      setWebcamReady(false);
    }
  }, [stopWebcam]);

  // Handle switching between Webcam and IP Camera
  useEffect(() => {
    if (!streaming) {
      stopWebcam();
      return;
    }

    if (isWebcamMode) {
      startWebcam();
    } else {
      stopWebcam();
      setCameraError('');
    }

    return () => {
      stopWebcam();
    };
  }, [streaming, selectedSourceId, isWebcamMode, startWebcam, stopWebcam]);

  // WebSocket Connection
  useEffect(() => {
    if (!streaming) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const camParam = isWebcamMode ? 'webcam' : (currentSource?.camera_id || selectedSourceId);
    const wsUrl = `ws://localhost:8000/api/ws/surveillance?camera_id=${camParam}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Surveillance WebSocket connected:', wsUrl);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'ready') return;

        setSurveillanceData(data);
        latestDetectionsRef.current = data;

        const newLogs: string[] = [];
        if (data.detections && data.detections.length > 0) {
          data.detections.forEach((d: any) => {
            const conf = Math.round((d.confidence || 0) * 100);
            const markedMsg = d.attendance_marked ? ' • Attendance Marked [PRESENT]' : '';
            newLogs.push(`[${new Date().toLocaleTimeString()}] ✓ Recognized: ${d.name} (${conf}%)${markedMsg}`);
          });
        }
        if (data.unknown_persons && data.unknown_persons.length > 0) {
          newLogs.push(`[${new Date().toLocaleTimeString()}] ⚠ Unknown person detected in surveillance feed.`);
        }

        if (newLogs.length > 0) {
          setStreamLogs(prev => [...newLogs, ...prev].slice(0, 20));
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('Surveillance WebSocket warning (will use REST frame processing fallback if needed):', err);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [streaming, selectedSourceId, isWebcamMode, currentSource]);

  // Capture webcam frames and send to AI backend for real YOLO + InsightFace recognition
  useEffect(() => {
    if (!streaming || !isWebcamMode) {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      return;
    }

    frameIntervalRef.current = setInterval(async () => {
      if (isProcessingFrame) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        // Create an off-screen capture canvas
        const offscreen = document.createElement('canvas');
        offscreen.width = video.videoWidth || 640;
        offscreen.height = video.videoHeight || 480;
        const octx = offscreen.getContext('2d');
        if (!octx) return;

        octx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
        const frameBase64 = offscreen.toDataURL('image/jpeg', 0.85);

        setIsProcessingFrame(true);

        // Try WebSocket first
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            action: 'frame',
            image: frameBase64
          }));
        } else {
          // REST API fallback
          const data = await api.processWebcamFrame(frameBase64, currentSource?.camera_id);
          setSurveillanceData(data);
          latestDetectionsRef.current = data;

          const newLogs: string[] = [];
          if (data.detections && data.detections.length > 0) {
            data.detections.forEach((d: any) => {
              const conf = Math.round((d.confidence || 0) * 100);
              const markedMsg = d.attendance_marked ? ' • Attendance Marked [PRESENT]' : '';
              newLogs.push(`[${new Date().toLocaleTimeString()}] ✓ Recognized: ${d.name} (${conf}%)${markedMsg}`);
            });
          }
          if (data.unknown_persons && data.unknown_persons.length > 0) {
            newLogs.push(`[${new Date().toLocaleTimeString()}] ⚠ Unknown person detected in surveillance feed.`);
          }
          if (newLogs.length > 0) {
            setStreamLogs(prev => [...newLogs, ...prev].slice(0, 20));
          }
        }
      } catch (err) {
        console.error('Error transmitting surveillance frame:', err);
      } finally {
        setIsProcessingFrame(false);
      }
    }, 1000); // 1 frame per second for optimal CPU inference

    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [streaming, isWebcamMode, isProcessingFrame, currentSource]);

  // Main Canvas Rendering Loop (Draws live video + AI bounding box overlays)
  useEffect(() => {
    let active = true;

    const render = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw Background or Live Video
      if (isWebcamMode && video && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, w, h);
      } else {
        // CCTV / Standby grid background
        ctx.fillStyle = '#080B11';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        if (!isWebcamMode) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.font = '12px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`RTSP Feed: ${currentSource?.location || 'Classroom Stream'}`, w / 2, h / 2);
          ctx.textAlign = 'left';
        }
      }

      // 2. Draw AI Bounding Boxes from Real Detections
      const currentData = latestDetectionsRef.current || surveillanceData;
      if (currentData) {
        // Scaling factors if video/model coordinates differ from canvas
        const srcW = (isWebcamMode && video?.videoWidth) ? video.videoWidth : 640;
        const srcH = (isWebcamMode && video?.videoHeight) ? video.videoHeight : 480;
        const scaleX = w / srcW;
        const scaleY = h / srcH;

        // Recognized students
        currentData.detections?.forEach((det: any) => {
          const [bx, by, bw, bh] = det.box;
          const x = bx * scaleX;
          const y = by * scaleY;
          const boxWidth = bw * scaleX;
          const boxHeight = bh * scaleY;

          // Glowing bounding box
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x, y, boxWidth, boxHeight);

          // Header badge
          const label = `${det.name} (${Math.round((det.confidence || 0) * 100)}%) • PRESENT`;
          ctx.font = 'bold 11px Outfit, Inter, sans-serif';
          const textWidth = ctx.measureText(label).width;

          ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
          ctx.fillRect(x - 1, Math.max(0, y - 26), textWidth + 14, 26);

          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(label, x + 6, Math.max(16, y - 8));
        });

        // Unknown persons
        currentData.unknown_persons?.forEach((det: any) => {
          const [bx, by, bw, bh] = det.box;
          const x = bx * scaleX;
          const y = by * scaleY;
          const boxWidth = bw * scaleX;
          const boxHeight = bh * scaleY;

          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x, y, boxWidth, boxHeight);

          const label = 'UNKNOWN PERSON ALERT';
          ctx.font = 'bold 10px Outfit, Inter, sans-serif';
          const textWidth = ctx.measureText(label).width;

          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.fillRect(x - 1, Math.max(0, y - 24), textWidth + 12, 24);

          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(label, x + 5, Math.max(15, y - 7));
        });

        // 3. HUD Overlay (Top-Left)
        ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
        ctx.fillRect(12, 12, 175, 62);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(12, 12, 175, 62);

        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(24, 26, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 10px Outfit, sans-serif';
        ctx.fillText(`${currentSource.name.toUpperCase()}`, 34, 29);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '9px monospace';
        ctx.fillText(`FPS: ${currentData.fps || 29.8} | LATENCY: ${currentData.latency_ms || 18}ms`, 20, 47);
        ctx.fillText(`DETECTED: ${currentData.persons_detected || currentData.detections?.length || 0} PERSON(S)`, 20, 61);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isWebcamMode, currentSource, surveillanceData]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full min-w-0">
        {/* Hidden video element for webcam video capture */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="hidden"
        />

        {/* Page Title & Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">AI Surveillance Live Hub</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Live automated face recognition & instant attendance logging via YOLO and InsightFace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {isWebcamMode ? 'Laptop Webcam Active' : 'CCTV Feed Active'}
            </span>
          </div>
        </div>

        {/* Permission / Device Error Notification */}
        {cameraError && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Camera Access Error</p>
              <p className="text-xs text-destructive/90 mt-0.5">{cameraError}</p>
              <button
                onClick={startWebcam}
                className="mt-2.5 px-3 py-1 rounded-lg bg-destructive text-white text-xs font-bold hover:bg-destructive/90 active:scale-95 transition-all"
              >
                Retry Camera Permission
              </button>
            </div>
          </div>
        )}

        {/* Main Surveillance Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Video Canvas Container */}
          <Card className="lg:col-span-2 border border-border/40 overflow-hidden flex flex-col !p-0">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border/60 mb-0 bg-accent/10">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                </span>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span>Surveillance Stream</span>
                  {isWebcamMode && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">
                      DEMO WEBCAM
                    </span>
                  )}
                </CardTitle>
              </div>

              {/* Camera Source Selector & Play/Pause */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 bg-background/60 border border-border rounded-xl px-2 py-1">
                  <Camera size={14} className="text-muted-foreground" />
                  <select
                    value={selectedSourceId}
                    onChange={(e) => setSelectedSourceId(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer pr-1"
                  >
                    {sources.map(s => (
                      <option key={s.id} value={s.id} className="bg-[#0B0F19] text-foreground">
                        {s.type === 'webcam' ? '💻 ' : '📹 '} {s.name} {s.type === 'webcam' ? '(Demo)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setStreaming(!streaming)}
                  className={`p-2 rounded-xl border border-border transition-all active:scale-95 ${
                    streaming
                      ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                      : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                  }`}
                  title={streaming ? 'Pause Surveillance' : 'Start Surveillance'}
                >
                  {streaming ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
            </CardHeader>

            {/* Canvas Display Viewport */}
            <div className="bg-[#080B11] p-4 flex items-center justify-center border-b border-border/40 min-h-[380px]">
              <canvas
                ref={canvasRef}
                width={640}
                height={420}
                className="w-full max-w-[640px] rounded-2xl shadow-2xl border border-border/60 bg-[#0F172A] aspect-[4/3] object-cover"
              />
            </div>

            {/* Neural Architecture & Features Footer */}
            <div className="p-3.5 px-5 flex flex-wrap justify-between items-center gap-2 bg-background/20 text-xs">
              <div className="flex items-center gap-4 text-muted-foreground text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Activity size={13} className="text-primary" />
                  InsightFace ArcFace 512-d Biometrics
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  PostgreSQL Registered Face Match
                </span>
              </div>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                <CheckCircle size={13} /> Auto-Attendance Enabled
              </span>
            </div>
          </Card>

          {/* AI Detection Timeline & Live Status */}
          <Card className="lg:col-span-1 border border-border/40 flex flex-col h-[520px] !p-0">
            <CardHeader className="p-4 border-b border-border/60 mb-0 bg-accent/10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  AI Detection Timeline
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">
                  Real-time events from neural face recognition
                </CardDescription>
              </div>
              <button
                onClick={() => setStreamLogs([])}
                className="p-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground text-[10px]"
                title="Clear Logs"
              >
                <RefreshCw size={12} />
              </button>
            </CardHeader>

            <CardContent className="p-3 overflow-y-auto flex-1 font-mono text-[11px] space-y-2 bg-[#080B11]">
              {streamLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <Users size={32} className="opacity-30 mb-2" />
                  <p className="font-sans font-semibold text-xs">Awaiting Biometric Detection</p>
                  <p className="font-sans text-[11px] text-muted-foreground/70 mt-1">
                    Position student in front of the camera. Recognized students will automatically check in.
                  </p>
                </div>
              ) : (
                streamLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-[11px] leading-relaxed transition-all ${
                      log.includes('Recognized')
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : log.includes('WARNING') || log.includes('Unknown')
                        ? 'bg-destructive/15 border-destructive/25 text-destructive'
                        : 'bg-accent/40 border-border text-muted-foreground'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </CardContent>

            {/* Quick Metrics Bar at Bottom of Card */}
            <div className="p-3 border-t border-border/40 bg-background/30 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-background/50 border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Camera Source</span>
                <span className="font-bold text-foreground truncate block">
                  {currentSource.type === 'webcam' ? 'Laptop Webcam' : 'IP Camera'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-background/50 border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Session Status</span>
                <span className="font-bold text-emerald-400 flex items-center justify-center gap-1">
                  <UserCheck size={12} /> Active
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
