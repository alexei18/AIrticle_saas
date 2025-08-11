  'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Title, Card, Stack, Text, Button, Group, Badge, SimpleGrid,
  Alert, Tabs, Paper, ThemeIcon, Center, Loader, List, Accordion, RingProgress, Progress
} from '@mantine/core';
import {
  IconAnalyze, IconArrowLeft, IconAlertCircle, IconCheck, IconClock, IconFileText,
  IconRefresh, IconWorld, IconX, IconChartLine, IconBulb, IconTools, IconEdit, IconSeo
} from '@tabler/icons-react';
import { websitesApi, analysisApi } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { Website, WebsiteAnalysis, CrawledPage, AnalysisReport, Recommendation } from '@/types';

export default function WebsiteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const websiteId = params?.id as string;

  const [website, setWebsite] = useState<Website | null>(null);
  const [analysis, setAnalysis] = useState<WebsiteAnalysis | null>(null);
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  const fetchWebsiteDetails = useCallback(async () => {
    if (!websiteId) return;
    try {
      const response = await websitesApi.getById(parseInt(websiteId));
      setWebsite(response.website);
      if (response.website.crawlStatus === 'crawling') {
        setIsAnalyzing(true);
      } else {
        setIsAnalyzing(false);
      }
    } catch (error) {
      notifications.show({ title: 'Eroare', message: 'Website-ul nu a putut fi încărcat.', color: 'red' });
    }
  }, [websiteId]);

  const fetchLatestAnalysis = useCallback(async () => {
    if (!websiteId) return;
    try {
      const response = await analysisApi.getLatest(parseInt(websiteId));
      setAnalysis(response.analysis);
    } catch (error) { setAnalysis(null); }
  }, [websiteId]);

  const fetchCrawledPages = useCallback(async () => {
    if (!websiteId) return;
    try {
      const response = await websitesApi.getCrawledPages(parseInt(websiteId));
      setCrawledPages(response.pages || []);
    } catch (error) { setCrawledPages([]); }
  }, [websiteId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchWebsiteDetails(), fetchLatestAnalysis(), fetchCrawledPages()]);
      setLoading(false);
    };
    if (websiteId) {
      init();
    }
  }, [websiteId, fetchWebsiteDetails, fetchLatestAnalysis, fetchCrawledPages]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isAnalyzing) {
      intervalId = setInterval(async () => {
        const res = await websitesApi.getById(parseInt(websiteId));
        if (res.website.crawlStatus !== 'crawling') {
          setIsAnalyzing(false);
          await Promise.all([fetchLatestAnalysis(), fetchCrawledPages()]);
          notifications.show({ title: 'Analiză Finalizată!', message: `Analiza pentru ${res.website.name} s-a terminat.`, color: 'green' });
          clearInterval(intervalId);
        }
      }, 15000);
    }
    return () => clearInterval(intervalId);
  }, [isAnalyzing, websiteId, fetchLatestAnalysis, fetchCrawledPages, fetchWebsiteDetails]);

  const handleTriggerAnalysis = async () => {
    if (!website) return;
    setIsAnalyzing(true);
    try {
      await analysisApi.trigger({ websiteId: website.id });
      await fetchWebsiteDetails();
      notifications.show({ title: 'Analiza a început', message: 'Vei fi notificat când se termină.', color: 'blue' });
    } catch (error: any) {
      setIsAnalyzing(false);
      notifications.show({ title: 'Eroare', message: 'Analiza nu a putut fi pornită.', color: 'red' });
    }
  };

  const getScoreColor = (score?: number) => !score ? 'gray' : score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red';
  const getStatusColor = (status: string) => ({ completed: 'green', crawling: 'blue', failed: 'red', pending: 'orange' })[status] || 'gray';
  const getStatusLabel = (status: string) => ({ completed: 'Analizat', crawling: 'În analiză', failed: 'Eșuat', pending: 'În așteptare' })[status] || 'Necunoscut';

  if (loading) {
    return <Center h="80vh"><Loader /></Center>;
  }

  if (!website) {
    return <Center h="80vh"><Alert color="red">Website negăsit.</Alert></Center>;
  }

  const AnalysisPanel = ({ title, report }: { title: string, report?: AnalysisReport | null }) => (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3}>{title}</Title>
        <Badge color={getScoreColor(report?.score)} variant="filled" size="lg">{report?.score || 'N/A'}/100</Badge>
      </Group>
      {report ? (
        <>
          <Progress value={report.score || 0} color={getScoreColor(report.score)} size="lg" mb="xl" />
          <Title order={4} mb="md">Probleme Agregate Găsite:</Title>
          {report.issues && report.issues.length > 0 ? (
            <List spacing="xs" size="sm" icon={<ThemeIcon color="red" size={16} radius="xl"><IconX size={10} /></ThemeIcon>}>
              {report.issues.map((issue: string, i: number) => <List.Item key={i}>{issue}</List.Item>)}
            </List>
          ) : <Text c="green" size="sm">Nicio problemă majoră găsită la nivel de domeniu.</Text>}
        </>
      ) : <Text c="dimmed">Date indisponibile. Rulează o analiză pentru a popula această secțiune.</Text>}
    </Card>
  );

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => router.push('/dashboard/websites')}>Înapoi</Button>
        <div style={{ flex: 1 }}>
          <Title order={1}>{website.name}</Title>
          <Group gap="sm">
            <Text c="dimmed">{website.domain}</Text>
            <Badge color={getStatusColor(website.crawlStatus)} variant="light">{getStatusLabel(website.crawlStatus)}</Badge>
          </Group>
        </div>
        <Button leftSection={<IconRefresh size={16} />} onClick={handleTriggerAnalysis} loading={isAnalyzing}>{analysis ? 'Re-analizează' : 'Analizează Acum'}</Button>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconAnalyze size={16} />}>Sumar</Tabs.Tab>
          <Tabs.Tab value="pages" leftSection={<IconFileText size={16} />}>Analiză Pagini ({crawledPages.length})</Tabs.Tab>
          <Tabs.Tab value="technical" leftSection={<IconTools size={16} />}>SEO Tehnic</Tabs.Tab>
          <Tabs.Tab value="content" leftSection={<IconEdit size={16} />}>Conținut</Tabs.Tab>
          <Tabs.Tab value="semrush" leftSection={<IconWorld size={16} />}>SEMrush</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="lg">
          {isAnalyzing && <Paper withBorder p="xl" ta="center"><Loader /> <Text mt="sm">Analiza este în curs... Aceasta poate dura câteva minute. Pagina se va actualiza automat.</Text></Paper>}
          {!isAnalyzing && analysis ? (
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <Card withBorder><Title order={3} mb="md">Scor General SEO</Title><Center><RingProgress size={180} thickness={18} roundCaps label={<Text c="blue" fw={700} ta="center" size="2.5rem">{analysis.overallScore}</Text>} sections={[{ value: analysis.overallScore, color: getScoreColor(analysis.overallScore) }]} /></Center></Card>
              <Card withBorder><Title order={3} mb="md">Recomandări Strategice AI</Title>{analysis.recommendations?.length > 0 ? <List spacing="sm" size="sm">{analysis.recommendations.map((rec: Recommendation, i: number) => <List.Item key={i} icon={<ThemeIcon color="blue" size={20} radius="xl"><IconBulb size={12} /></ThemeIcon>}><strong>{rec.title}</strong>: {rec.description}</List.Item>)}</List> : <Text c="green" size="sm">Felicitări! Nu au fost identificate probleme strategice majore.</Text>}</Card>
            </SimpleGrid>
          ) : !isAnalyzing && (
            <Paper p="xl" ta="center" withBorder>
              <Stack align="center">
                <IconAnalyze size={48} color="gray" />
                <Title order={3}>Nicio analiză efectuată</Title>
                <Text c="dimmed">Rulează o analiză pentru a obține un raport detaliat.</Text>
                <Button onClick={handleTriggerAnalysis}>Analizează Acum</Button>
              </Stack>
            </Paper>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="pages" pt="lg">
          <Card withBorder>
            <Title order={3} mb="md">Analiza Paginilor Individuale</Title>
            <Text c="dimmed" mb="lg">Vezi problemele și recomandările AI pentru fiecare pagină. Paginile cu cele mai multe probleme sunt afișate primele.</Text>
            {isAnalyzing ? <Center p="xl"><Loader /><Text ml="md">Se analizează paginile...</Text></Center> :
              crawledPages.length > 0 ? (
                <Accordion variant="separated" chevronPosition="left">
                  {crawledPages.map((page: CrawledPage) => (
                    <Accordion.Item key={page.id} value={String(page.id)}>
                      <Accordion.Control>
                        <Group justify="space-between">
                          <Text fw={500} truncate maw={{ base: 200, sm: 500, md: 700 }}>{page.url.replace(`https://${website?.domain}`, '') || '/'}</Text>
                          <Group>
                            <Text size="sm" c="dimmed" hiddenFrom="xs">Scor Pagina:</Text>
                            <RingProgress size={40} thickness={4} label={<Center><Text size="xs">{page.seoScore}</Text></Center>} sections={[{ value: page.seoScore || 0, color: getScoreColor(page.seoScore) }]} />
                          </Group>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                          <div>
                            <Title order={5} mb="xs">Probleme Identificate</Title>
                            {page.issues && page.issues.length > 0 ? <List size="sm" spacing="xs" icon={<ThemeIcon color="red" size={16} radius="xl"><IconX size={10} /></ThemeIcon>}>{page.issues.map((issue: string, i: number) => <List.Item key={i}>{issue}</List.Item>)}</List> : <Text size="sm" c="green">Nicio problemă majoră.</Text>}
                          </div>
                          <div>
                            <Title order={5} mb="xs">Recomandări AI</Title>
                            {page.aiRecommendations && page.aiRecommendations.length > 0 ? <List size="sm" spacing="xs" icon={<ThemeIcon color="teal" size={16} radius="xl"><IconCheck size={10} /></ThemeIcon>}>{page.aiRecommendations.map((rec: string, i: number) => <List.Item key={i}>{rec}</List.Item>)}</List> : <Text size="sm" c="dimmed">Nicio recomandare specifică.</Text>}
                          </div>
                        </SimpleGrid>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
              ) : <Text c="dimmed" ta="center" p="md">Nicio pagină crawl-uită. Rulează o analiză completă.</Text>}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="technical" pt="lg">
          {!isAnalyzing && analysis ? <AnalysisPanel title="Sumar Agregat - SEO Tehnic" report={analysis.technicalReport} /> : <Center p="xl"><Text>Rulează o analiză pentru a vedea sumarul tehnic.</Text></Center>}
        </Tabs.Panel>

        <Tabs.Panel value="content" pt="lg">
          {!isAnalyzing && analysis ? <AnalysisPanel title="Sumar Agregat - Analiză Conținut" report={analysis.contentReport} /> : <Center p="xl"><Text>Rulează o analiză pentru a vedea sumarul de conținut.</Text></Center>}
        </Tabs.Panel>

        <Tabs.Panel value="semrush" pt="lg">
          {!isAnalyzing && analysis && analysis.semrushReport ? (
            <Card withBorder>
              <Title order={3} mb="md">Sumar SEMrush</Title>
              {analysis.semrushReport.error ? <Alert color="orange" title="Date Indisponibile">{analysis.semrushReport.error}</Alert> :
                analysis.semrushReport.data ? (
                  <SimpleGrid cols={2}>
                    <Text><strong>Scor Autoritate:</strong> {analysis.semrushReport.data.rank}</Text>
                    <Text><strong>Keywords Organice:</strong> {analysis.semrushReport.data.organicKeywords?.toLocaleString()}</Text>
                    <Text><strong>Trafic Estimat:</strong> {analysis.semrushReport.data.organicTraffic?.toLocaleString()}</Text>
                    <Text><strong>Cost Trafic Est.:</strong> ${analysis.semrushReport.data.organicCost?.toLocaleString()}</Text>
                  </SimpleGrid>
                ) : <Text>Nu s-au putut prelua datele de la SEMrush.</Text>}
            </Card>
          ) : <Center p="xl"><Text>Rulează o analiză pentru a vedea datele de la SEMrush.</Text></Center>}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
