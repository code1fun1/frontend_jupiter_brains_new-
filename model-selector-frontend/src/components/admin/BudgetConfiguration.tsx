import { useState } from 'react';
import { DollarSign, Building2, User, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface BudgetSettings {
  enterpriseMonthlyBudget: number;
  enterpriseDailyLimit: number;
  enterpriseAlertThreshold: number;
  individualMonthlyBudget: number;
  individualDailyLimit: number;
  individualAlertThreshold: number;
  enforceHardLimits: boolean;
  sendAlertEmails: boolean;
}

export function BudgetConfiguration() {
  const [settings, setSettings] = useState<BudgetSettings>({
    enterpriseMonthlyBudget: 10000,
    enterpriseDailyLimit: 500,
    enterpriseAlertThreshold: 80,
    individualMonthlyBudget: 100,
    individualDailyLimit: 20,
    individualAlertThreshold: 90,
    enforceHardLimits: true,
    sendAlertEmails: true,
  });

  const handleSave = () => {
    toast.success('Budget settings saved successfully');
  };

  return (
    <div className="space-y-6">
      {/* Enterprise Budget */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Enterprise Budget
          </CardTitle>
          <CardDescription>Set budget limits for enterprise-level usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="enterpriseMonthly">Monthly Budget ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="enterpriseMonthly"
                  type="number"
                  value={settings.enterpriseMonthlyBudget}
                  onChange={(e) => setSettings({ ...settings, enterpriseMonthlyBudget: Number(e.target.value) })}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enterpriseDaily">Daily Limit ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="enterpriseDaily"
                  type="number"
                  value={settings.enterpriseDailyLimit}
                  onChange={(e) => setSettings({ ...settings, enterpriseDailyLimit: Number(e.target.value) })}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enterpriseAlert">Alert Threshold (%)</Label>
              <Input
                id="enterpriseAlert"
                type="number"
                min={0}
                max={100}
                value={settings.enterpriseAlertThreshold}
                onChange={(e) => setSettings({ ...settings, enterpriseAlertThreshold: Number(e.target.value) })}
                className="bg-background"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-accent/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Current usage: <strong className="text-foreground">$7,234.50</strong> (72.3% of monthly budget)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Individual User Budget */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Individual User Budget
          </CardTitle>
          <CardDescription>Set default budget limits for individual users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="individualMonthly">Monthly Budget ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="individualMonthly"
                  type="number"
                  value={settings.individualMonthlyBudget}
                  onChange={(e) => setSettings({ ...settings, individualMonthlyBudget: Number(e.target.value) })}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="individualDaily">Daily Limit ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="individualDaily"
                  type="number"
                  value={settings.individualDailyLimit}
                  onChange={(e) => setSettings({ ...settings, individualDailyLimit: Number(e.target.value) })}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="individualAlert">Alert Threshold (%)</Label>
              <Input
                id="individualAlert"
                type="number"
                min={0}
                max={100}
                value={settings.individualAlertThreshold}
                onChange={(e) => setSettings({ ...settings, individualAlertThreshold: Number(e.target.value) })}
                className="bg-background"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Budget Enforcement</CardTitle>
          <CardDescription>Configure how budget limits are enforced</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
            <div>
              <div className="font-medium">Enforce Hard Limits</div>
              <div className="text-sm text-muted-foreground">Block requests when budget is exceeded</div>
            </div>
            <Switch
              checked={settings.enforceHardLimits}
              onCheckedChange={(enforceHardLimits) => setSettings({ ...settings, enforceHardLimits })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
            <div>
              <div className="font-medium">Send Alert Emails</div>
              <div className="text-sm text-muted-foreground">Notify admins when thresholds are reached</div>
            </div>
            <Switch
              checked={settings.sendAlertEmails}
              onCheckedChange={(sendAlertEmails) => setSettings({ ...settings, sendAlertEmails })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full gap-2">
        <Save className="h-4 w-4" />
        Save Budget Settings
      </Button>
    </div>
  );
}
