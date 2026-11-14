'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Lock, Settings, Server } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure neural network constraints and active attendance criteria.</p>
        </div>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>Surveillance Rules & System Config</CardTitle>
            <CardDescription>Setup administrative variables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2 text-foreground"><Settings size={16} /> Attendance Logging Rules</h4>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Minimum scan count for present status (surveillance threshold)</span>
                <input type="number" defaultValue={5} className="w-16 px-2 py-1 border border-border bg-background/50 rounded-lg text-center outline-none" />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Late check-in duration (minutes after class starts)</span>
                <input type="number" defaultValue={15} className="w-16 px-2 py-1 border border-border bg-background/50 rounded-lg text-center outline-none" />
              </div>
            </div>

            <hr className="border-border/60" />

            <div className="space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2 text-foreground"><Server size={16} /> Backend GPU Services</h4>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Anti-spoofing liveness verification filter</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-primary focus:ring-primary" />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>InsightFace active model cache size</span>
                <select className="px-2 py-1 text-xs border border-border bg-background/50 rounded-lg text-muted-foreground">
                  <option value="512">512 MB (MobileNet)</option>
                  <option value="2048">2 GB (ResNet50)</option>
                  <option value="4096">4 GB (ArcFace-Large)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
