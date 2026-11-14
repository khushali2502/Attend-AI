'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, Upload, Camera, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

interface FaceRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  mode: 'register' | 'update';
  onSuccess: () => void;
}

export default function FaceRegistrationModal({ isOpen, onClose, student, mode, onSuccess }: FaceRegistrationModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamLoading, setWebcamLoading] = useState(false);
  const [capturedNotice, setCapturedNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync webcam stream to video element whenever showWebcam becomes true or stream changes
  useEffect(() => {
    if (showWebcam && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch((err) => {
        console.warn('Video auto-play failed:', err);
      });
    }
  }, [showWebcam]);

  // Clean up media stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const totalFiles = files.length + newFiles.length;
    if (totalFiles > 10) {
      setError('Maximum 10 images allowed.');
      return;
    }
    setError('');
    setResults([]);
    setSuccessMsg('');

    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    newFiles.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" is not a valid image file.`);
        return;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    });

    setFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...validPreviews]);
  }, [files.length]);

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setResults([]);
    setSuccessMsg('');
  };

  const startWebcam = async () => {
    setError('');
    setWebcamLoading(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or secure context.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      setShowWebcam(true);
    } catch (err: any) {
      console.error('Webcam error:', err);
      let msg = 'Could not access webcam.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in browser permissions.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on your system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is already in use by another application.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      setShowWebcam(false);
    } finally {
      setWebcamLoading(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `webcam_${Date.now()}.jpg`, { type: 'image/jpeg' });
        addFiles([file]);
        setCapturedNotice(true);
        setTimeout(() => setCapturedNotice(false), 1200);
      }
    }, 'image/jpeg', 0.95);
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowWebcam(false);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Please upload or capture at least 1 face image.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setResults([]);
    setSuccessMsg('');

    try {
      let result;
      if (mode === 'register') {
        result = await api.registerFaceMulti(student.id, files);
      } else {
        result = await api.updateFace(student.id, files);
      }

      setSuccessMsg(result.message);
      setResults(result.validation_results || []);

      // Delay close to show success feedback
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Face registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    stopWebcam();
    previews.forEach((p) => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
    setResults([]);
    setError('');
    setSuccessMsg('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0B0F19] text-foreground w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/40 bg-background/30">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              {mode === 'register' ? 'Register Face' : 'Update Face'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {student?.user?.name} — Roll: <span className="font-mono text-primary font-semibold">{student?.roll_number}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-accent/50 border border-border/50 text-muted-foreground hover:text-foreground transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Upload Section */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Upload Face Photos (1-10 images)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-border/70 hover:border-primary/60 bg-background/20 hover:bg-background/40 rounded-xl p-8 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload size={24} />
              </div>
              <p className="text-sm font-bold text-foreground">Click to upload or drag images</p>
              <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WEBP — Clear frontal face photos</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files));
                e.target.value = '';
              }}
            />
          </div>

          {/* Webcam Toggle Button */}
          <div className="flex gap-2">
            {!showWebcam ? (
              <button
                type="button"
                onClick={startWebcam}
                disabled={webcamLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold transition-all shadow-sm"
              >
                {webcamLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {webcamLoading ? 'Starting Camera...' : 'Use Webcam to Capture'}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopWebcam}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/40 bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-semibold transition-all"
              >
                <X size={16} /> Close Webcam
              </button>
            )}
          </div>

          {/* Live Webcam Preview Section */}
          {showWebcam && (
            <div className="space-y-3 p-3 rounded-2xl border border-border/60 bg-black/40">
              <div className="relative rounded-xl overflow-hidden border border-border/60 bg-black aspect-video flex items-center justify-center">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch((e) => console.warn(e));
                    }
                  }}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    (e.target as HTMLVideoElement).play().catch(console.warn);
                  }}
                />

                {/* Face Alignment Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-44 h-56 rounded-[50%] border-2 border-dashed border-primary/60 flex items-center justify-center">
                    <span className="text-[11px] text-white/90 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-md">
                      Position Face Here
                    </span>
                  </div>
                </div>

                {/* Captured flash feedback */}
                {capturedNotice && (
                  <div className="absolute inset-0 bg-white/25 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-150">
                    <div className="bg-black/90 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-500/50 shadow-lg">
                      <CheckCircle size={18} className="text-emerald-400" /> Photo Snapshot Added!
                    </div>
                  </div>
                )}
              </div>

              {/* Capture Action Button */}
              <button
                type="button"
                onClick={capturePhoto}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm tracking-wide shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Camera size={18} /> Capture Photo Snapshot
              </button>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* Selected Images Preview Grid */}
          {previews.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Selected Photos ({files.length}/10)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {previews.map((preview, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-border/60 bg-background/30 aspect-square">
                    <img
                      src={preview}
                      alt={`Face ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      title="Remove image"
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/70 text-white hover:bg-destructive hover:text-white transition-all shadow-md"
                    >
                      <Trash2 size={13} />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-center text-[10px] text-white py-0.5 font-mono font-semibold">
                      Photo {idx + 1}
                    </div>
                    {/* Validation indicator badge if returned */}
                    {results[idx] && (
                      <div className={`absolute top-1.5 left-1.5 p-1 rounded-md ${results[idx].valid ? 'bg-emerald-500 text-white' : 'bg-destructive text-white'}`}>
                        {results[idx].valid ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Results Display */}
          {results.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                AI Face Validation Results
              </label>
              {results.map((r: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                    r.valid
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-destructive/10 border-destructive/20 text-destructive'
                  }`}
                >
                  {r.valid ? <CheckCircle size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
                  <span>Image {r.image_index}: {r.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || files.length === 0}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 ${
              files.length === 0
                ? 'bg-muted/40 text-muted-foreground border border-border/40 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-indigo-600/30 active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing Biometric Embeddings...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                {mode === 'register' ? 'Register Face' : 'Update Face'}
                {files.length > 0 && ` (${files.length} ${files.length === 1 ? 'photo' : 'photos'} ready)`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
