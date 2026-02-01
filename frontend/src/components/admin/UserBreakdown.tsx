import { useState } from 'react';
import { Search, ArrowUpDown, TrendingUp, TrendingDown, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// Dummy user data
const userData = [
  { id: 1, name: 'John Smith', email: 'john.smith@company.com', credits: 856.40, requests: 2840, topModel: 'ChatGPT', overrides: 3, status: 'active' },
  { id: 2, name: 'Sarah Johnson', email: 'sarah.j@company.com', credits: 724.20, requests: 2150, topModel: 'JupiterBrains', overrides: 0, status: 'active' },
  { id: 3, name: 'Michael Brown', email: 'm.brown@company.com', credits: 645.80, requests: 1980, topModel: 'Claude', overrides: 5, status: 'warning' },
  { id: 4, name: 'Emily Davis', email: 'emily.d@company.com', credits: 523.60, requests: 1650, topModel: 'ChatGPT', overrides: 1, status: 'active' },
  { id: 5, name: 'David Wilson', email: 'd.wilson@company.com', credits: 489.30, requests: 1420, topModel: 'Gemini', overrides: 8, status: 'warning' },
  { id: 6, name: 'Lisa Anderson', email: 'lisa.a@company.com', credits: 456.70, requests: 1380, topModel: 'JupiterBrains', overrides: 0, status: 'active' },
  { id: 7, name: 'James Taylor', email: 'james.t@company.com', credits: 398.20, requests: 1200, topModel: 'Claude', overrides: 2, status: 'active' },
  { id: 8, name: 'Jennifer Martinez', email: 'j.martinez@company.com', credits: 367.90, requests: 1100, topModel: 'ChatGPT', overrides: 0, status: 'active' },
];

const topUsersChartData = userData.slice(0, 5).map(user => ({
  name: user.name.split(' ')[0],
  credits: user.credits,
}));

const chartConfig = {
  credits: {
    label: 'Credits ($)',
    color: 'hsl(0, 0%, 40%)',
  },
};

export function UserBreakdown() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'credits' | 'requests' | 'overrides'>('credits');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredUsers = userData
    .filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
    });

  const handleSort = (field: 'credits' | 'requests' | 'overrides') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const totalCredits = userData.reduce((sum, user) => sum + user.credits, 0);
  const avgCreditsPerUser = totalCredits / userData.length;
  const totalOverrides = userData.reduce((sum, user) => sum + user.overrides, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{userData.length}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Avg. Credits/User</p>
              <p className="text-2xl font-bold">${avgCreditsPerUser.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total IP Overrides</p>
              <p className="text-2xl font-bold">{totalOverrides}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Top Users by Credit Usage</CardTitle>
          <CardDescription>Top 5 users consuming the most credits</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <BarChart data={topUsersChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
              <XAxis dataKey="name" stroke="hsl(0, 0%, 50%)" />
              <YAxis stroke="hsl(0, 0%, 50%)" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="credits" fill="hsl(0, 0%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">User Details</CardTitle>
          <CardDescription>Complete breakdown of user activity</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort('credits')}
                    >
                      Credits
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </th>
                  <th className="text-left py-3 px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort('requests')}
                    >
                      Requests
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Top Model</th>
                  <th className="text-left py-3 px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort('overrides')}
                    >
                      Overrides
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-accent/30">
                    <td className="py-3 px-2">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-2 font-medium">${user.credits.toFixed(2)}</td>
                    <td className="py-3 px-2">{user.requests.toLocaleString()}</td>
                    <td className="py-3 px-2">
                      <Badge variant="secondary">{user.topModel}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <span className={user.overrides > 3 ? 'text-red-500 font-medium' : ''}>
                        {user.overrides}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={user.status === 'warning' ? 'destructive' : 'default'}>
                        {user.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
