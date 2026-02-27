import { Shield, AlertTriangle, MapPin, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

// Dummy IP risk data
const ipRiskByRegion = [
  { region: 'North America', risk: 12, overrides: 15, color: 'hsl(120, 40%, 50%)' },
  { region: 'Europe', risk: 28, overrides: 22, color: 'hsl(45, 80%, 50%)' },
  { region: 'Asia Pacific', risk: 45, overrides: 38, color: 'hsl(0, 70%, 50%)' },
  { region: 'South America', risk: 18, overrides: 8, color: 'hsl(120, 40%, 50%)' },
  { region: 'Middle East', risk: 35, overrides: 12, color: 'hsl(45, 80%, 50%)' },
];

const overridesByType = [
  { type: 'Data Sensitivity', count: 28, percentage: 35 },
  { type: 'Compliance Violation', count: 22, percentage: 27 },
  { type: 'Geographic Restriction', count: 18, percentage: 23 },
  { type: 'Rate Limit', count: 12, percentage: 15 },
];

const overridesTrend = [
  { week: 'Week 1', onPrem: 12, cloud: 8 },
  { week: 'Week 2', onPrem: 15, cloud: 10 },
  { week: 'Week 3', onPrem: 10, cloud: 12 },
  { week: 'Week 4', onPrem: 8, cloud: 6 },
];

const recentOverrides = [
  { id: 1, user: 'Michael Brown', type: 'Data Sensitivity', region: 'Asia Pacific', timestamp: '2 hours ago', status: 'resolved' },
  { id: 2, user: 'David Wilson', type: 'Geographic Restriction', region: 'Europe', timestamp: '5 hours ago', status: 'pending' },
  { id: 3, user: 'Unknown User', type: 'Rate Limit', region: 'North America', timestamp: '8 hours ago', status: 'resolved' },
  { id: 4, user: 'Sarah Johnson', type: 'Compliance Violation', region: 'Middle East', timestamp: '1 day ago', status: 'resolved' },
  { id: 5, user: 'James Taylor', type: 'Data Sensitivity', region: 'Asia Pacific', timestamp: '2 days ago', status: 'escalated' },
];

const chartConfig = {
  risk: {
    label: 'Risk Score',
    color: 'hsl(0, 0%, 40%)',
  },
  overrides: {
    label: 'Overrides',
    color: 'hsl(0, 0%, 60%)',
  },
  onPrem: {
    label: 'On-Prem Switches',
    color: 'hsl(0, 0%, 30%)',
  },
  cloud: {
    label: 'Cloud Overrides',
    color: 'hsl(0, 0%, 60%)',
  },
};

export function IPRiskAnalytics() {
  const totalOverrides = overridesByType.reduce((sum, item) => sum + item.count, 0);
  const highRiskRegions = ipRiskByRegion.filter(r => r.risk > 30).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total IP Overrides</p>
                <p className="text-2xl font-bold">{totalOverrides}</p>
                <div className="flex items-center gap-1 text-sm text-green-500">
                  <TrendingDown className="h-3 w-3" />
                  <span>-15% this month</span>
                </div>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">High Risk Regions</p>
              <p className="text-2xl font-bold text-red-500">{highRiskRegions}</p>
              <p className="text-sm text-muted-foreground">of {ipRiskByRegion.length} total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">On-Prem Redirects</p>
              <p className="text-2xl font-bold">47</p>
              <p className="text-sm text-muted-foreground">this month</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Pending Reviews</p>
              <p className="text-2xl font-bold text-yellow-500">3</p>
              <p className="text-sm text-muted-foreground">require attention</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk by Region */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              IP Risk by Region
            </CardTitle>
            <CardDescription>Risk scores and override counts by geographic region</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={ipRiskByRegion}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                <XAxis dataKey="region" stroke="hsl(0, 0%, 50%)" tick={{ fontSize: 10 }} />
                <YAxis stroke="hsl(0, 0%, 50%)" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="risk" fill="hsl(0, 0%, 40%)" radius={[4, 4, 0, 0]} name="Risk Score" />
                <Bar dataKey="overrides" fill="hsl(0, 0%, 60%)" radius={[4, 4, 0, 0]} name="Overrides" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Override Types */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Override Types
            </CardTitle>
            <CardDescription>Breakdown of override reasons</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overridesByType.map((item) => (
                <div key={item.type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.type}</span>
                    <span className="font-medium">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 bg-accent rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/60 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Override Trend */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Override Trend (Last 4 Weeks)
          </CardTitle>
          <CardDescription>On-Premise switches vs Cloud overrides over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <LineChart data={overridesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
              <XAxis dataKey="week" stroke="hsl(0, 0%, 50%)" />
              <YAxis stroke="hsl(0, 0%, 50%)" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="onPrem" stroke="hsl(0, 0%, 30%)" strokeWidth={2} name="On-Prem Switches" />
              <Line type="monotone" dataKey="cloud" stroke="hsl(0, 0%, 70%)" strokeWidth={2} name="Cloud Overrides" />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Overrides */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Recent Override Events</CardTitle>
          <CardDescription>Latest IP-related override events requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Region</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Time</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOverrides.map((event) => (
                  <tr key={event.id} className="border-b border-border/50 hover:bg-accent/30">
                    <td className="py-3 px-2 font-medium">{event.user}</td>
                    <td className="py-3 px-2">
                      <Badge variant="secondary">{event.type}</Badge>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{event.region}</td>
                    <td className="py-3 px-2 text-muted-foreground">{event.timestamp}</td>
                    <td className="py-3 px-2">
                      <Badge
                        variant={
                          event.status === 'resolved' ? 'default' :
                          event.status === 'pending' ? 'secondary' : 'destructive'
                        }
                      >
                        {event.status}
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
