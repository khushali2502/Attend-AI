'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Lock, Bell, Eye } from 'lucide-react';

export default function StudentSettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Portal Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your account security, notification alerts, and accessibility rules.
          </p>
        </div>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>System & Account Preferences</CardTitle>
            <CardDescription>Configure portal variables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Password edit mock */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-2 text-foreground"><Lock size={16} /> Security</h4>
              <div className="space-y-3">
                <input type="password" placeholder="Current Password" className="w-full px-4 py-2.5 glass-input text-xs" />
                <input type="password" placeholder="New Password" className="w-full px-4 py-2.5 glass-input text-xs" />
                <button className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-xl hover:bg-primary/95 transition-all shadow-md">
                  Update Security Credentials
                </button>
              </div>
            </div>

            <hr className="border-border/60" />

            {/* Notification triggers */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2 text-foreground"><Bell size={16} /> Communications</h4>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Email me when AI logs my attendance</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-primary focus:ring-primary" />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Push notifications on timetable overrides</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-primary focus:ring-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
