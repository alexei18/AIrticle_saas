'use client';

import { useEffect, useState } from 'react';
import {
  Title, Grid, Card, Text, Group, Stack, Button, Badge,
  SimpleGrid, Loader, Center, Paper, ThemeIcon, Skeleton
} from '@mantine/core';
import {
  IconWorld, IconSearch, IconEdit, IconTrendingUp, IconPlus,
  IconArrowUp, IconArrowDown
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '@/store/authStore';
import { dashboardApi, DashboardOverviewData } from '@/lib/api';
import { notifications } from '@mantine/notifications';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, description, icon, color }: StatCardProps) {
  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between">
        <Stack gap={0}>
          <Text size="sm" tt="uppercase" c="dimmed">
            {title}
          </Text>
          <Text fz={32} fw={700}>
            {value}
          </Text>
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        </Stack>
        <ThemeIcon size={48} radius="md" variant="light" color={color}>
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await dashboardApi.getDashboardOverview();
        if (response.success) {
          setData(response.data);
        } else {
          throw new Error("Failed to fetch overview data");
        }
      } catch (error) {
        notifications.show({
          title: 'Eroare la încărcarea datelor',
          message: 'Nu s-au putut prelua statisticile. Te rog încearcă din nou.',
          color: 'red'
        });
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Stack gap="xl">
        <Group justify="space-between"><Skeleton height={50} width={400} /><Skeleton height={36} width={150} /></Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}><Skeleton height={100} /><Skeleton height={100} /><Skeleton height={100} /><Skeleton height={100} /></SimpleGrid>
        <Grid>
          <Grid.Col span={{ base: 12, lg: 8 }}><Skeleton height={300} /></Grid.Col>
          <Grid.Col span={{ base: 12, lg: 4 }}><Skeleton height={300} /></Grid.Col>
        </Grid>
      </Stack>
    );
  }

  if (!data || data.stats.totalWebsites === 0) {
    return (
      <Center h="70vh">
        <Paper p="xl" ta="center" bg="gray.0" radius="md">
          <Stack align="center" gap="md">
            <ThemeIcon size={80} variant="light" color="blue" radius="xl">
              <IconWorld size={40} />
            </ThemeIcon>
            <div>
              <Text size="xl" fw={500} mb="xs">
                Bun venit, {user?.firstName}!
              </Text>
              <Text size="sm" c="dimmed" mb="lg">
                Adaugă primul tău website pentru a începe analiza SEO.
              </Text>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => router.push('/dashboard/websites')}
                size="md"
              >
                Adaugă Primul Website
              </Button>
            </div>
          </Stack>
        </Paper>
      </Center>
    );
  }

  const keywordChartData = [
    { name: 'Top 3', count: data.keywordPerformance.distribution.top3, fill: 'var(--mantine-color-green-6)' },
    { name: 'Top 10', count: data.keywordPerformance.distribution.top10, fill: 'var(--mantine-color-blue-6)' },
    { name: 'Peste 10', count: data.keywordPerformance.distribution.beyond10, fill: 'var(--mantine-color-orange-6)' },
  ];

  const getStatusColor = (status: string) => ({ completed: 'green', crawling: 'blue', failed: 'red', pending: 'orange' })[status] || 'gray';
  const getStatusLabel = (status: string) => ({ completed: 'Analizat', crawling: 'În analiză', failed: 'Eșuat', pending: 'În așteptare' })[status] || 'Necunoscut';


  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={1} mb="xs">
            Bună ziua, {user?.firstName}! 👋
          </Title>
          <Text size="lg" c="dimmed">
            Iată o privire de ansamblu asupra performanțelor tale SEO
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => router.push('/dashboard/websites')}
        >
          Adaugă Website
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <StatCard title="Website-uri" value={data.stats.totalWebsites} description="site-uri monitorizate" icon={<IconWorld size={24} />} color="blue" />
        <StatCard title="Keywords" value={data.stats.totalKeywords} description="cuvinte cheie urmărite" icon={<IconSearch size={24} />} color="green" />
        <StatCard title="Articole Generate" value={data.stats.totalArticles} description="articole create" icon={<IconEdit size={24} />} color="orange" />
        <StatCard title="Trafic Organic" value={data.stats.monthlyTraffic.toLocaleString()} description="vizitatori (ultimele 30 zile)" icon={<IconTrendingUp size={24} />} color="purple" />
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card withBorder radius="md" p="lg" h="100%">
            <Title order={3} mb="md">Website-urile Tale</Title>
            <Stack gap="md">
              {data.websites.slice(0, 4).map((website) => (
                <Paper key={website.id} p="md" bg="gray.0" radius="md">
                  <Group justify="space-between">
                    <Group>
                      <ThemeIcon size={40} variant="light" color="blue"><IconWorld size={20} /></ThemeIcon>
                      <div>
                        <Text fw={500}>{website.name}</Text>
                        <Text size="sm" c="dimmed">
                          {website.domain} • Ultimul crawl: {website.lastCrawledAt ? new Date(website.lastCrawledAt).toLocaleDateString('ro-RO') : 'Niciodată'}
                        </Text>
                      </div>
                    </Group>
                    <Group>
                      <Badge color={getStatusColor(website.crawlStatus)} variant="light">{getStatusLabel(website.crawlStatus)}</Badge>
                      <Button variant="subtle" size="sm" onClick={() => router.push(`/dashboard/websites/${website.id}`)}>Detalii</Button>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card withBorder radius="md" p="lg" h="100%">
            <Title order={3} mb="md">Distribuția Pozițiilor</Title>
            <Text c="dimmed" size="sm">Poziție medie: #{data.keywordPerformance.avgPosition}</Text>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={keywordChartData} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(238, 238, 238, 0.5)' }} />
                <Bar dataKey="count" name="Keywords" barSize={40} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}