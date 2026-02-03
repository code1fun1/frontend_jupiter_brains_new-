import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Settings, BarChart3, Users, DollarSign, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useChatStoreContext } from '@/contexts/ChatStoreContext';
import { ModelConfiguration } from '@/components/admin/ModelConfiguration';
import { BudgetConfiguration } from '@/components/admin/BudgetConfiguration';
import { UsageAnalytics } from '@/components/admin/UsageAnalytics';
import { UserBreakdown } from '@/components/admin/UserBreakdown';
import { IPRiskAnalytics } from '@/components/admin/IPRiskAnalytics';

export default function Admin() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin, signOut } = useAuth();

  const {
    models,
    updateModel,
    refreshModels,
    removeModel,
  } = useChatStoreContext();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!authLoading && user && !isAdmin) {
      navigate('/');
    }
  }, [authLoading, user, isAdmin, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background dark">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background dark">
      <div className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5" />
            <div className="font-semibold">Admin Dashboard</div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Chat
            </Button>
            <Button variant="ghost" className="gap-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="overview">
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

          <div className="mt-6">
            <TabsContent value="overview" className="mt-0">
              <UsageAnalytics />
            </TabsContent>

            <TabsContent value="models" className="mt-0">
              <ModelConfiguration
                models={models}
                onUpdateModel={updateModel}
                onRemoveModel={removeModel}
                onRefreshModels={refreshModels}
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
      </div>
    </div>
  );
}
