'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/utils/api';
import { User, Mail, ShieldAlert, BookOpen, Layers, Calendar, Phone, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentProfile().then(setProfile).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const profileImageUrl = profile?.profile_image_url
    ? (profile.profile_image_url.startsWith('http') ? profile.profile_image_url : `http://localhost:8000${profile.profile_image_url}`)
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Student Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Personal identity records, academic enrollment, and biometric registry status.
          </p>
        </div>

        <Card className="border border-border/40 overflow-hidden">
          {/* Cover Banner */}
          <div className="h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
            <div className="absolute -bottom-12 left-6">
              {profileImageUrl ? (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-4 border-background shadow-xl bg-background">
                  <img
                    src={profileImageUrl}
                    alt={profile?.user?.name || 'Student Photo'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white text-3xl border-4 border-background shadow-xl">
                  {profile?.user?.name?.split(' ').map((n: string) => n[0]).join('') || 'S'}
                </div>
              )}
            </div>

            {/* Account Status Badge in Banner */}
            <div className="absolute top-4 right-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md ${
                profile?.user?.is_active !== false
                  ? 'bg-emerald-500/20 text-white border border-emerald-400/40'
                  : 'bg-destructive/20 text-white border border-destructive/40'
              }`}>
                <span className={`w-2 h-2 rounded-full ${profile?.user?.is_active !== false ? 'bg-emerald-400 animate-pulse' : 'bg-destructive'}`} />
                {profile?.user?.is_active !== false ? 'Account Active' : 'Account Inactive'}
              </span>
            </div>
          </div>

          <CardContent className="pt-16 space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/40">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{profile?.user?.name}</h2>
                <p className="text-sm font-mono text-primary font-semibold">{profile?.roll_number}</p>
              </div>
              <div>
                {profile?.face_registered ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle size={14} /> Biometrics Registered
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <AlertCircle size={14} /> Biometrics Not Registered
                  </span>
                )}
              </div>
            </div>

            {/* Grid of Profile Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 border border-border/50 bg-background/30 rounded-xl space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <User size={14} className="text-primary" /> Full Name
                </span>
                <p className="font-bold text-foreground">{profile?.user?.name}</p>
              </div>

              <div className="p-4 border border-border/50 bg-background/30 rounded-xl space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Mail size={14} className="text-primary" /> Email Address
                </span>
                <p className="font-bold text-foreground">{profile?.user?.email}</p>
              </div>

              <div className="p-4 border border-border/50 bg-background/30 rounded-xl space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <BookOpen size={14} className="text-primary" /> Roll Number
                </span>
                <p className="font-mono font-bold text-foreground">{profile?.roll_number}</p>
              </div>

              <div className="p-4 border border-border/50 bg-background/30 rounded-xl space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <BookOpen size={14} className="text-primary" /> Department
                </span>
                <p className="font-bold text-foreground">
                  {profile?.department?.name || 'Computer Science & Engineering'} {profile?.department?.code ? `(${profile.department.code})` : ''}
                </p>
              </div>

              <div className="p-4 border border-border/50 bg-background/30 rounded-xl space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Layers size={14} className="text-primary" /> Division
                </span>
                <p className="font-bold text-foreground">{profile?.division ? `Division ${profile.division}` : 'Division A'}</p>
              </div>

              <div className="p-4 border border-border/50 bg-background/30 rounded-xl space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary" /> Academic Year
                </span>
                <p className="font-bold text-foreground">{profile?.year ? `Year ${profile.year}` : 'Year 3'}</p>
              </div>

              {profile?.phone && (
                <div className="p-4 border border-border/50 bg-background/30 rounded-xl space-y-1.5">
                  <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Phone size={14} className="text-primary" /> Contact Phone
                  </span>
                  <p className="font-bold text-foreground">{profile.phone}</p>
                </div>
              )}

              <div className="p-4 border border-border/50 bg-background/30 rounded-xl space-y-1.5">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-primary" /> Account Status
                </span>
                <p className="font-bold text-foreground">
                  {profile?.user?.is_active !== false ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>

            {/* Biometric Status Notice */}
            <div className={`p-4 border rounded-xl flex items-start gap-3.5 ${
              profile?.face_registered 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
            }`}>
              {profile?.face_registered ? (
                <CheckCircle size={22} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={22} className="shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h5 className="font-bold text-sm">
                  {profile?.face_registered ? 'Biometric Face Enrolled' : 'Biometric Face Not Registered'}
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {profile?.face_registered 
                    ? 'Your face neural embedding is active in the AttendAI classroom surveillance network. Attendance will be recorded automatically when classroom cameras detect you.'
                    : 'Your facial biometrics are not registered yet. For security reasons, students cannot upload or modify their own biometrics. Please visit your department faculty office or an administrator to complete face registration.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
