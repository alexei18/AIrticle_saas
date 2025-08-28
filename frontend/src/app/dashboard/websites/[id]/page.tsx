  'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Title, Card, Stack, Text, Button, Group, Badge, SimpleGrid,
  Alert, Tabs, Paper, ThemeIcon, Center, Loader, List, Accordion, RingProgress, Progress, Modal, Code, CopyButton, Tooltip, ActionIcon
} from '@mantine/core';
import {
  IconAnalyze, IconArrowLeft, IconAlertCircle, IconCheck, IconClock, IconFileText,
  IconRefresh, IconWorld, IconX, IconChartLine, IconBulb, IconTools, IconEdit, IconSeo, IconCopy, IconSitemap, IconLink
} from '@tabler/icons-react';
import { websitesApi, analysisApi, aiSuggestionsApi } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { Website, WebsiteAnalysis, CrawledPage, AnalysisReport, Recommendation, Backlink } from '@/types';

export default function WebsiteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const websiteId = params?.id as string;

  const [website, setWebsite] = useState<Website | null>(null);
  const [analysis, setAnalysis] = useState<WebsiteAnalysis | null>(null);
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([]);
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBacklinks, setLoadingBacklinks] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  // State pentru noul tab de sugestii
  const [showSuggestionsTab, setShowSuggestionsTab] = useState(false);

  // State pentru modalul de generare
  const [modalOpened, setModalOpened] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const fetchBacklinks = useCallback(async () => {
    if (!websiteId) return;
    setLoadingBacklinks(true);
    try {
      const response = await websitesApi.getBacklinks(parseInt(websiteId));
      setBacklinks(response.backlinks || []);
    } catch (error) {
      setBacklinks([]);
      notifications.show({ title: 'Eroare Backlinks', message: 'Nu am putut încărca backlink-urile.', color: 'red' });
    } finally {
      setLoadingBacklinks(false);
    }
  }, [websiteId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchWebsiteDetails(), fetchLatestAnalysis(), fetchCrawledPages(), fetchBacklinks()]);
      setLoading(false);
    };
    if (websiteId) {
      init();
    }
  }, [websiteId, fetchWebsiteDetails, fetchLatestAnalysis, fetchCrawledPages, fetchBacklinks]);

  // Verifică dacă trebuie afișat tab-ul de sugestii
  useEffect(() => {
    if (crawledPages && crawledPages.length > 0) {
      const hasMissingSuggestions = crawledPages.some(page =>
        page.suggestions?.some(s => s.includes('sitemap.xml') || s.includes('Schema.org'))
      );
      setShowSuggestionsTab(hasMissingSuggestions);
    } else {
      setShowSuggestionsTab(false);
    }
  }, [crawledPages]);

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

  const handleGenerateSitemap = async () => {
    if (!website) return;
    setIsGenerating(true);
    setModalTitle('Sitemap XML Generat');
    try {
      const sitemap = await aiSuggestionsApi.generateSitemap(website.id);
      setModalContent(sitemap);
      setModalOpened(true);
    } catch (error) {
      notifications.show({ title: 'Eroare', message: 'Sitemap-ul nu a putut fi generat.', color: 'red' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSchema = async (pageId: number) => {
    setIsGenerating(true);
    setModalTitle('Schema.org (JSON-LD) Generat');
    try {
      const schema = await aiSuggestionsApi.generateSchema(pageId);
      setModalContent(JSON.stringify(schema, null, 2));
      setModalOpened(true);
    } catch (error) {
      notifications.show({ title: 'Eroare', message: 'Schema nu a putut fi generată.', color: 'red' });
    } finally {
      setIsGenerating(false);
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
          {showSuggestionsTab && (
            <Tabs.Tab value="ai-suggestions" leftSection={<IconBulb size={16} />} color="blue">
              Recomandări AI
            </Tabs.Tab>
          )}
          <Tabs.Tab value="technical" leftSection={<IconTools size={16} />}>SEO Tehnic</Tabs.Tab>
          <Tabs.Tab value="content" leftSection={<IconEdit size={16} />}>Conținut</Tabs.Tab>
          <Tabs.Tab value="backlinks" leftSection={<IconLink size={16} />}>Backlinks ({backlinks.length})</Tabs.Tab>
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

        <Tabs.Panel value="ai-suggestions" pt="lg">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3}>Generator Sitemap.xml</Title>
                <IconSitemap size={24} color="gray" />
              </Group>
              <Text c="dimmed" size="sm" mb="lg">
                Un sitemap ajută motoarele de căutare să descopere și să indexeze eficient toate paginile website-ului tău. Analiza noastră a indicat că un sitemap ar putea lipsi sau fi incomplet.
              </Text>
              <Button
                fullWidth
                leftSection={<IconSitemap size={16} />}
                onClick={handleGenerateSitemap}
                loading={isGenerating && modalTitle.includes('Sitemap')}
              >
                Generează Sitemap.xml
              </Button>
            </Card>
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3}>Generator Schema.org</Title>
                <IconSeo size={24} color="gray" />
              </Group>
              <Text c="dimmed" size="sm" mb="lg">
                Datele structurate (Schema.org) oferă context motoarelor de căutare, îmbunătățind modul în care paginile tale apar în rezultate. Mai jos sunt paginile unde nu am detectat o schemă.
              </Text>
              <Stack gap="xs">
                {crawledPages.filter(p => p.suggestions?.some(s => s.includes('Schema.org'))).map(page => (
                  <Paper key={page.id} withBorder p="xs" radius="sm">
                    <Group justify="space-between">
                      <Text size="sm" truncate maw={250}>{page.url.replace(`https://${website?.domain}`, '') || '/'}</Text>
                      <Button
                        size="compact-xs"
                        variant="light"
                        onClick={() => handleGenerateSchema(page.id)}
                        loading={isGenerating && modalTitle.includes('Schema')}
                      >
                        Generează Schema
                      </Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Card>
          </SimpleGrid>
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
          {!isAnalyzing && analysis ? <AnalysisPanel title="Sumar Ag-regat - Analiză Conținut" report={analysis.contentReport} /> : <Center p="xl"><Text>Rulează o analiză pentru a vedea sumarul de conținut.</Text></Center>}
        </Tabs.Panel>

        <Tabs.Panel value="backlinks" pt="lg">
          <Card withBorder>
            <Title order={3} mb="md">Analiza Backlink-urilor</Title>
            <Text c="dimmed" mb="lg">Lista de backlink-uri care trimit către domeniul tău. Datele sunt furnizate de DataForSEO.</Text>
            {loadingBacklinks ? (
              <Center p="xl"><Loader /><Text ml="md">Se încarcă backlink-urile...</Text></Center>
            ) : backlinks.length > 0 ? (
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Domeniu Sursă</Table.Th>
                    <Table.Th>URL Sursă</Table.Th>
                    <Table.Th>Anchor Text</Table.Th>
                    <Table.Th>Tip</Table.Th>
                    <Table.Th>Rank</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {backlinks.map((link, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>{link.domain_from}</Table.Td>
                      <Table.Td><Text truncate maw={300}><a href={link.url_from} target="_blank" rel="noopener noreferrer">{link.url_from}</a></Text></Table.Td>
                      <Table.Td>{link.anchor || '(empty)'}</Table.Td>
                      <Table.Td>
                        <Badge color={link.dofollow ? 'green' : 'orange'} variant="light">
                          {link.dofollow ? 'Dofollow' : 'Nofollow'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{link.rank}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed" ta="center" p="md">Nu s-au găsit backlink-uri sau serviciul nu este disponibil.</Text>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={modalTitle} size="xl">
        <Paper pos="relative">
          <Code block style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {modalContent}
          </Code>
          <CopyButton value={modalContent}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copiat!' : 'Copiază'} withArrow position="left">
                <ActionIcon 
                  color={copied ? 'teal' : 'gray'} 
                  onClick={copy}
                  style={{ position: 'absolute', top: 5, right: 5 }}
                >
                  <IconCopy size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Paper>
      </Modal>
    </Stack>
  );
}
