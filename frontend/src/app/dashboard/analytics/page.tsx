'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, Title, Tooltip, Legend,
  LineElement, PointElement, ArcElement, Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Group, Text, Title as MantineTitle, Button, Select, Grid, Card, Stack,
  Table, Badge, Loader, Center, Paper, Alert, Box, Skeleton
} from '@mantine/core';
import {
  IconSearch, IconTarget, IconEye, IconUsers, IconChartLine, IconWorld, IconAlertCircle,
  IconPlayerPlay, IconLink, IconBulb
} from '@tabler/icons-react';
import { dashboardApi, AnalyticsData, websitesApi, analysisApi, seoApi } from '@/lib/api';
import { Website } from '@/types';
import { notifications } from '@mantine/notifications';

ChartJS.register(
  CategoryScale, LinearScale, Title, Tooltip, Legend,
  LineElement, PointElement, ArcElement, Filler
);

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchWebsitesAndInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await websitesApi.getAll();
      const userWebsites = res.websites || [];
      setWebsites(userWebsites);
      const initialWebsiteId = 'all';
      setSelectedWebsiteId(initialWebsiteId);
      await fetchAnalyticsData(initialWebsiteId);
    } catch (error) {
      console.error("Failed to fetch websites", error);
      setIsLoading(false);
    }
  }, []);

  const fetchAnalyticsData = useCallback(async (websiteId: string) => {
    setIsLoading(true);
    try {
      const result = await dashboardApi.getAnalytics({ dateRange: '30', websiteId });
      setAnalyticsData(result.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalyticsData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebsitesAndInitialData();
  }, [fetchWebsitesAndInitialData]);

  const handleStartAnalysis = async () => {
    if (!selectedWebsiteId || selectedWebsiteId === 'all') {
      notifications.show({ title: 'Selecție necesară', message: 'Te rog selectează un website specific pentru a porni analiza.', color: 'yellow' });
      return;
    };
    setIsAnalyzing(true);
    try {
      // Sincronizăm mai întâi datele GA, apoi rulăm restul
      await googleAnalyticsApi.syncData(parseInt(selectedWebsiteId));
      await Promise.all([
        analysisApi.trigger({ websiteId: parseInt(selectedWebsiteId) }),
        seoApi.triggerDeepAnalysis(parseInt(selectedWebsiteId))
      ]);
      notifications.show({ title: 'Analiza a început', message: 'Procesul complet de analiză a fost inițiat. Vei fi notificat când se termină.', color: 'blue' });
    } catch (error) {
      notifications.show({ title: 'Eroare', message: 'Analiza nu a putut fi pornită.', color: 'red' });
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing && selectedWebsiteId && selectedWebsiteId !== 'all') {
      interval = setInterval(async () => {
        try {
          const res = await websitesApi.getById(parseInt(selectedWebsiteId));
          if (res.website.crawlStatus === 'completed') {
            setIsAnalyzing(false);
            notifications.show({ title: 'Analiză Finalizată!', message: `Datele pentru ${res.website.name} sunt gata.`, color: 'green' });
            fetchAnalyticsData(selectedWebsiteId);
            clearInterval(interval);
          }
        } catch (error) { console.error("Polling error", error); }
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, selectedWebsiteId, fetchAnalyticsData]);

  const websiteOptions = useMemo(() => [
    { value: 'all', label: 'Toate Website-urile' },
    ...websites.map(w => ({ value: String(w.id), label: w.name }))
  ], [websites]);

  const renderEmptyState = () => (
    <Center h="50vh">
      <Paper p="xl" withBorder radius="md" style={{ maxWidth: 500 }}>
        <Stack align="center" gap="md">
          <IconAlertCircle size={48} color="gray" />
          <MantineTitle order={3}>Nu există date analitice</MantineTitle>
          <Text c="dimmed" ta="center">
            Selectează un website specific și pornește o analiză profundă pentru a colecta date de la Google Analytics, SerpApi și pentru a rula un audit complet.
          </Text>
          <Button
            mt="md"
            leftSection={<IconPlayerPlay size={16} />}
            onClick={handleStartAnalysis}
            disabled={!selectedWebsiteId || selectedWebsiteId === 'all' || isAnalyzing}
            loading={isAnalyzing}
            size="md"
          >
            {isAnalyzing ? 'Analiză în curs...' : 'Pornește Analiza Profundă'}
          </Button>
        </Stack>
      </Paper>
    </Center>
  );

  const renderSkeletonState = () => (
    <Stack>
      <Grid>
        {[...Array(6)].map((_, i) => <Grid.Col key={i} span={{ base: 12, sm: 6, md: 4, lg: 2 }}><Skeleton height={80} radius="md" /></Grid.Col>)}
      </Grid>
      <Grid>
        <Grid.Col span={{ base: 12, lg: 8 }}><Skeleton height={380} radius="md" /></Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}><Skeleton height={380} radius="md" /></Grid.Col>
      </Grid>
      <Skeleton height={200} radius="md" />
    </Stack>
  );

  const renderDataState = (data: AnalyticsData) => {
    const trafficChartData = {
      labels: data.trafficTrend.map(item => item.date),
      datasets: [{ label: 'Sesiuni Organice', data: data.trafficTrend.map(item => item.organic), borderColor: '#228be6', backgroundColor: 'rgba(34, 139, 230, 0.1)', tension: 0.1, fill: true }]
    };
    const positionDistributionData = {
      labels: ['Top 3', 'Top 4-10', 'Top 11-50', 'Peste 50'],
      datasets: [{ data: [data.positionDistribution.top3, data.positionDistribution.top10, data.positionDistribution.top50, data.positionDistribution.beyond50], backgroundColor: ['#40c057', '#228be6', '#fab005', '#fa5252'], borderWidth: 0 }]
    };
    return (
      <Stack gap="xl">
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2 }}><Card withBorder><Stack align="center" gap="xs"><Text size="xs" c="dimmed">Keywords</Text><Text size="xl" fw={700}>{data.totalKeywords || 0}</Text></Stack></Card></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2 }}><Card withBorder><Stack align="center" gap="xs"><Text size="xs" c="dimmed">Poziție Medie</Text><Text size="xl" fw={700}>#{data.avgPosition || 'N/A'}</Text></Stack></Card></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2 }}><Card withBorder><Stack align="center" gap="xs"><Text size="xs" c="dimmed">Sesiuni GA</Text><Text size="xl" fw={700}>{data.totalTraffic.toLocaleString()}</Text></Stack></Card></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2 }}><Card withBorder><Stack align="center" gap="xs"><Text size="xs" c="dimmed">Utilizatori GA</Text><Text size="xl" fw={700}>{data.totalUsers.toLocaleString()}</Text></Stack></Card></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2 }}><Card withBorder><Stack align="center" gap="xs"><Text size="xs" c="dimmed">Backlinks</Text><Text size="xl" fw={700}>{data.backlinksCount || 0}</Text></Stack></Card></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2 }}><Card withBorder><Stack align="center" gap="xs"><Text size="xs" c="dimmed">Content Gaps</Text><Text size="xl" fw={700}>{data.topContentGaps.length || 0}</Text></Stack></Card></Grid.Col>
        </Grid>
        <Grid>
          <Grid.Col span={{ base: 12, lg: 8 }}><Card withBorder><Text size="lg" fw={600} mb="lg">Tendința Traficului Organic (Sesiuni)</Text><Box h={320}><Line data={trafficChartData} options={{ responsive: true, maintainAspectRatio: false }} /></Box></Card></Grid.Col>
          <Grid.Col span={{ base: 12, lg: 4 }}><Card withBorder><Text size="lg" fw={600} mb="lg">Distribuția Pozițiilor</Text><Box h={320}><Doughnut data={positionDistributionData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} /></Box></Card></Grid.Col>
        </Grid>
        <Card withBorder>
          <Text size="lg" fw={600} mb="lg">Top Oportunități de Conținut (Content Gaps)</Text>
          <Text size="sm" c="dimmed" mb="md">Acestea sunt keywords pentru care competitorii tăi rankează, dar tu nu. Creează conținut în jurul lor!</Text>
          <Table.ScrollContainer minWidth={500}>
            <Table verticalSpacing="sm">
              <Table.Thead><Table.Tr><Table.Th>Keyword</Table.Th><Table.Th>Scor Oportunitate</Table.Th><Table.Th>Acțiune</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>
                {data.topContentGaps.length > 0 ? data.topContentGaps.map((gap, index) => (
                  <Table.Tr key={index}>
                    <Table.Td><Text fw={500}>{gap.keyword}</Text></Table.Td>
                    <Table.Td><Badge color="blue" variant="light">{gap.opportunityScore}/10</Badge></Table.Td>
                    <Table.Td><Button size="xs" variant="outline">Generează Articol</Button></Table.Td>
                  </Table.Tr>
                )) : <Table.Tr><Table.Td colSpan={3}><Center p="md"><Text c="dimmed">Nicio oportunitate de conținut găsită. Rulează o analiză profundă.</Text></Center></Table.Td></Table.Tr>}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      </Stack>
    );
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Stack gap="xs">
          <MantineTitle order={1}>Analytics</MantineTitle>
          <Text c="dimmed">Analizează performanța keywords-urilor și a traficului organic</Text>
        </Stack>
        <Group>
          <Select
            leftSection={<IconWorld size={16} />}
            placeholder="Selectează un website"
            value={selectedWebsiteId}
            onChange={(value) => setSelectedWebsiteId(value || 'all')}
            data={websiteOptions}
            disabled={isAnalyzing || isLoading}
          />
        </Group>
      </Group>

      {isLoading ? renderSkeletonState() :
        isAnalyzing ? renderSkeletonState() :
          analyticsData ? renderDataState(analyticsData) :
            renderEmptyState()}
    </Stack>
  );
}