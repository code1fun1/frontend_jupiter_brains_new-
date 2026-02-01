import { useState } from 'react';
import { X, Settings, BarChart3, Users, Shield, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIModel } from '@/types/chat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModelConfiguration } from './ModelConfiguration';
import { BudgetConfiguration } from './BudgetConfiguration';
import { UsageAnalytics } from './UsageAnalytics';
import { UserBreakdown } from './UserBreakdown';
import { IPRiskAnalytics } from './IPRiskAnalytics';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  models: AIModel[];
  onUpdateModel: (modelId: string, updates: Partial<AIModel>) => void;
  onAddModel: (model: Omit<AIModel, 'id'>) => void;
  onRemoveModel: (modelId: string) => void;
}

export function AdminDashboard({
  isOpen,
  onClose,
  models,
  onUpdateModel,
  onAddModel,
  onRemoveModel,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-card border-border">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Dashboard
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-5 bg-muted/50">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Models</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Budget</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">IP Risk</span>
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[calc(90vh-180px)] mt-4 pr-2 scrollbar-thin">
            <TabsContent value="overview" className="mt-0">
              <UsageAnalytics />
            </TabsContent>

            <TabsContent value="models" className="mt-0">
              <ModelConfiguration
                models={models}
                onUpdateModel={onUpdateModel}
                onAddModel={onAddModel}
                onRemoveModel={onRemoveModel}
              />
            </TabsContent>

            <TabsContent value="budget" className="mt-0">
              <BudgetConfiguration />
            </TabsContent>

            <TabsContent value="users" className="mt-0">
              <UserBreakdown />
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <IPRiskAnalytics />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
