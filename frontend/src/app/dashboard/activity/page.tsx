'use client';

import { useState, useEffect } from 'react';
import { 
  Paper,
  Group,
  Text,
  Title,
  Button,
  Stack,
  Grid,
  Card,
  Badge,
  Select,
  ThemeIcon,
  Loader,
  Center,
  Divider,
  Timeline
} from '@mantine/core';
import { 
  IconSearch, 
  IconTrendingUp, 
  IconTrendingDown, 
  IconPlus, 
  IconSettings, 
  IconEye,
  IconChartBar,
  IconUsers,
  IconGlobe,
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconFilter,
  IconCalendar,
  IconDownload,
  IconRefresh,
  IconBolt,
  IconTarget,
  IconActivity
} from '@tabler/icons-react';

interface ActivityItem {
  id: string;
  type: 'keyword_added' | 'position_change' | 'website_analyzed' | 'report_generated' | 'setting_changed' | 'login' | 'upgrade' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    keyword?: string;
    oldPosition?: number;
    newPosition?: number;
    website?: string;
    reportType?: string;
    change?: number;
  };
  priority: 'low' | 'medium' | 'high';
  category: 'seo' | 'system' | 'account' | 'alert';
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'position_change',
    title: 'Keyword Position Improved',
    description: 'servicii web development a urcat de pe poziția 7 pe poziția 3',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metadata: { keyword: 'servicii web development', oldPosition: 7, newPosition: 3 },
    priority: 'high',
    category: 'seo'
  },
  {
    id: '2',
    type: 'keyword_added',
    title: 'New Keywords Added',
    description: '5 noi keywords au fost adăugate pentru monitorizare',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    priority: 'medium',
    category: 'seo'
  },
  {
    id: '3',
    type: 'website_analyzed',
    title: 'Website Analysis Complete',
    description: 'Analiza completă pentru example.com a fost finalizată',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    metadata: { website: 'example.com' },
    priority: 'medium',
    category: 'seo'
  },
  {
    id: '4',
    type: 'alert',
    title: 'Competitor Alert',
    description: 'Un competitor a urcat pe keyword-ul principal "marketing digital"',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    metadata: { keyword: 'marketing digital' },
    priority: 'high',
    category: 'alert'
  },
  {
    id: '5',
    type: 'report_generated',
    title: 'Monthly Report Ready',
    description: 'Raportul lunar pentru noiembrie este gata pentru download',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    metadata: { reportType: 'monthly' },
    priority: 'medium',
    category: 'system'
  },
  {
    id: '6',
    type: 'position_change',
    title: 'Position Drop Alert',
    description: 'aplicatii mobile personalizate a scăzut de pe poziția 4 pe poziția 9',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    metadata: { keyword: 'aplicatii mobile personalizate', oldPosition: 4, newPosition: 9 },
    priority: 'high',
    category: 'alert'
  },
  {
    id: '7',
    type: 'login',
    title: 'Account Login',
    description: 'Autentificare reușită din București, România',
    timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    priority: 'low',
    category: 'account'
  },
  {
    id: '8',
    type: 'setting_changed',
    title: 'Notification Settings Updated',
    description: 'Setările de notificare email au fost modificate',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'low',
    category: 'account'
  }
];

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'seo' | 'system' | 'account' | 'alert'>('all');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    high: 0,
    seo: 0,
    alerts: 0
  });

  useEffect(() => {
    fetchActivities();
  }, [filter, timeRange]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/dashboard/activities?filter=${filter}&timeRange=${timeRange}&limit=20&offset=0`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const formattedActivities = result.data.activities.map((activity: any) => ({
          ...activity,
          timestamp: activity.created_at
        }));
        setActivities(formattedActivities);
        setStats(result.data.stats);
      } else {
        throw new Error(result.error || 'Failed to fetch activities');
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Fallback to mock data
      let filteredActivities = mockActivities;
      
      if (filter !== 'all') {
        filteredActivities = mockActivities.filter(activity => activity.category === filter);
      }
      
      const now = new Date();
      const timeFilters = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        all: Infinity
      };
      
      if (timeRange !== 'all') {
        const cutoff = now.getTime() - timeFilters[timeRange];
        filteredActivities = filteredActivities.filter(
          activity => new Date(activity.timestamp).getTime() > cutoff
        );
      }
      
      setActivities(filteredActivities);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  };

  const getActivityIcon = (type: string, priority: string) => {
    const color = priority === 'high' ? 'red' : priority === 'medium' ? 'yellow' : 'gray';

    switch (type) {
      case 'keyword_added':
        return <IconPlus />;
      case 'position_change':
        return <IconChartBar />;
      case 'website_analyzed':
        return <IconGlobe />;
      case 'report_generated':
        return <IconDownload />;
      case 'setting_changed':
        return <IconSettings />;
      case 'login':
        return <IconUsers />;
      case 'upgrade':
        return <IconBolt />;
      case 'alert':
        return <IconAlertTriangle />;
      default:
        return <IconActivity />;
    }
  };

  const getActivityColor = (category: string, priority: string) => {
    if (priority === 'high') return 'red';
    
    switch (category) {
      case 'seo': return 'blue';
      case 'alert': return 'orange';
      case 'system': return 'green';
      case 'account': return 'grape';
      default: return 'gray';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} minute în urmă`;
    } else if (hours < 24) {
      return `${hours} ${hours === 1 ? 'oră' : 'ore'} în urmă`;
    } else {
      return `${days} ${days === 1 ? 'zi' : 'zile'} în urmă`;
    }
  };

  // Stats are now managed by state and set from API response

  if (loading) {
    return (
      <Center h="50vh">
        <Stack align="center">
          <Loader size="lg" />
          <Text>Se încarcă activitățile...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="xl" p="xl">
      {/* Header */}
      <Group justify="space-between">
        <Stack gap="xs">
          <Title order={1}>Activity Feed</Title>
          <Text c="dimmed">Monitorizează toate activitățile și schimbările din contul tău</Text>
        </Stack>
        
        <Button
          onClick={handleRefresh}
          loading={refreshing}
          leftSection={<IconRefresh size={16} />}
        >
          {refreshing ? 'Actualizează...' : 'Refresh'}
        </Button>
      </Group>

      {/* Stats Cards */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder>
            <Group justify="space-between">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Total Activități</Text>
                <Text size="xl" fw={700}>{stats.total}</Text>
              </Stack>
              <ThemeIcon size="xl" variant="light" color="blue">
                <IconActivity size={24} />
              </ThemeIcon>
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder>
            <Group justify="space-between">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Prioritate Înaltă</Text>
                <Text size="xl" fw={700}>{stats.high}</Text>
              </Stack>
              <ThemeIcon size="xl" variant="light" color="red">
                <IconAlertTriangle size={24} />
              </ThemeIcon>
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder>
            <Group justify="space-between">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">SEO Activities</Text>
                <Text size="xl" fw={700}>{stats.seo}</Text>
              </Stack>
              <ThemeIcon size="xl" variant="light" color="green">
                <IconTarget size={24} />
              </ThemeIcon>
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder>
            <Group justify="space-between">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Alerte</Text>
                <Text size="xl" fw={700}>{stats.alerts}</Text>
              </Stack>
              <ThemeIcon size="xl" variant="light" color="orange">
                <IconAlertTriangle size={24} />
              </ThemeIcon>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Filters */}
      <Card withBorder p="md">
        <Group justify="space-between">
          <Group>
            <Group gap="xs">
              <IconFilter size={16} />
              <Text size="sm" fw={500}>Categorie:</Text>
              <Select
                value={filter}
                onChange={(value) => setFilter(value as any)}
                data={[
                  { value: 'all', label: 'Toate' },
                  { value: 'seo', label: 'SEO' },
                  { value: 'alert', label: 'Alerte' },
                  { value: 'system', label: 'Sistem' },
                  { value: 'account', label: 'Cont' }
                ]}
                w={120}
              />
            </Group>

            <Group gap="xs">
              <IconCalendar size={16} />
              <Text size="sm" fw={500}>Perioada:</Text>
              <Select
                value={timeRange}
                onChange={(value) => setTimeRange(value as any)}
                data={[
                  { value: 'all', label: 'Toate timpurile' },
                  { value: 'today', label: 'Azi' },
                  { value: 'week', label: 'Ultima săptămână' },
                  { value: 'month', label: 'Ultima lună' }
                ]}
                w={150}
              />
            </Group>
          </Group>

          <Button variant="subtle" leftSection={<IconDownload size={16} />}>
            Export
          </Button>
        </Group>
      </Card>

      {/* Activity Feed */}
      <Card withBorder>
        <Group p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
          <Text size="lg" fw={600}>Recent Activity</Text>
        </Group>

        {activities.length === 0 ? (
          <Center p="xl">
            <Stack align="center">
              <IconActivity size={48} color="var(--mantine-color-gray-4)" />
              <Title order={3} c="dimmed">Nicio activitate găsită</Title>
              <Text c="dimmed" ta="center">
                Nu există activități pentru filtrul selectat. Încearcă să modifici criteriile de căutare.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Timeline active={activities.length} bulletSize={24} lineWidth={2} p="md">
            {activities.map((activity) => (
              <Timeline.Item
                key={activity.id}
                bullet={
                  <ThemeIcon
                    size={24}
                    radius="xl"
                    variant="filled"
                    color={getActivityColor(activity.category, activity.priority)}
                  >
                    {getActivityIcon(activity.type, activity.priority)}
                  </ThemeIcon>
                }
              >
                <Card withBorder p="md" mb="md">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>{activity.title}</Text>
                    <Group gap="xs">
                      <Badge
                        color={getActivityColor(activity.category, activity.priority)}
                        variant="light"
                        size="sm"
                      >
                        {activity.priority}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {formatRelativeTime(activity.timestamp)}
                      </Text>
                    </Group>
                  </Group>
                  
                  <Text size="sm" c="dimmed" mb="sm">
                    {activity.description}
                  </Text>
                  
                  {activity.metadata && (
                    <Group gap="xs">
                      {activity.metadata.keyword && (
                        <Badge variant="outline" leftSection={<IconSearch size={12} />}>
                          {activity.metadata.keyword}
                        </Badge>
                      )}
                      {activity.metadata.website && (
                        <Badge variant="outline" leftSection={<IconGlobe size={12} />}>
                          {activity.metadata.website}
                        </Badge>
                      )}
                      {activity.metadata.oldPosition && activity.metadata.newPosition && (
                        <Badge
                          variant="outline"
                          color={activity.metadata.newPosition < activity.metadata.oldPosition ? 'green' : 'red'}
                          leftSection={
                            activity.metadata.newPosition < activity.metadata.oldPosition ? 
                              <IconTrendingUp size={12} /> : 
                              <IconTrendingDown size={12} />
                          }
                        >
                          #{activity.metadata.oldPosition} → #{activity.metadata.newPosition}
                        </Badge>
                      )}
                    </Group>
                  )}
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>
        )}

        {activities.length > 0 && (
          <Center p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
            <Button variant="subtle">
              Încarcă mai multe activități
            </Button>
          </Center>
        )}
      </Card>
    </Stack>
  );
}