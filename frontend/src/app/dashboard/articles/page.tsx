'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Title, Button, Group, Stack, Card, Text, Badge, ActionIcon, Menu, Modal, TextInput,
  Select, MultiSelect, NumberInput, LoadingOverlay, Center, Paper, ThemeIcon,
  SimpleGrid, Progress, Alert, Tabs, Loader
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconDots, IconEdit, IconTrash, IconEye, IconRobot,
  IconBrandOpenai, IconSparkles, IconAlertCircle, IconArticle
} from '@tabler/icons-react';
import { articlesApi, keywordsApi, websitesApi, analysisApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Article, Website, Keyword } from '@/types';

export default function ArticlesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [bulkGenerateLoading, setBulkGenerateLoading] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [activeTab, setActiveTab] = useState<string | null>('ai');

  const aiForm = useForm({
    initialValues: {
      websiteId: '', title: '', targetKeywords: [] as string[],
      articleLength: 2000, tone: 'professional', language: 'romanian',
    },
    validate: {
      websiteId: (val) => (!val ? 'Selectează un website' : null),
      title: (val) => (val.length < 10 ? 'Titlul trebuie să aibă cel puțin 10 caractere' : null),
      targetKeywords: (val) => (val.length === 0 ? 'Adaugă cel puțin un cuvânt cheie' : null),
    }
  });

  const bulkForm = useForm({
    initialValues: {
      websiteId: '', numberOfArticles: 5, articleLength: 1500,
      language: 'romanian', tone: 'professional'
    },
    validate: {
      websiteId: (val) => (!val ? 'Selectează un website' : null),
      numberOfArticles: (val) => (val < 1 || val > 20 ? 'Numărul trebuie să fie între 1 și 20' : null),
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [articlesResponse, websitesResponse, keywordsResponse] = await Promise.all([
        articlesApi.getAll(),
        websitesApi.getAll(),
        keywordsApi.getAll()
      ]);
      setArticles(articlesResponse.articles || []);
      setWebsites(websitesResponse.websites || []);
      setKeywords(keywordsResponse.keywords || []);
    } catch (error: any) {
      notifications.show({
        title: 'Eroare la încărcarea datelor',
        message: error.response?.data?.error || 'A apărut o eroare neașteptată',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSiteAnalysis = async (websiteId: number) => {
    try {
      const response = await analysisApi.getLatest(websiteId);
      return response.analysis || null;
    } catch (error) { return null; }
  };

  const handleAIGenerate = async (values: typeof aiForm.values) => {
    const siteAnalysis = await checkSiteAnalysis(parseInt(values.websiteId));
    if (!siteAnalysis) {
      notifications.show({ title: 'Analiză site necesară', message: 'Rulează o analiză din secțiunea Websites înainte de a genera articole.', color: 'orange', autoClose: 8000, icon: <IconAlertCircle size={16} /> });
      return;
    }
    setGenerateLoading(true);
    try {
      await articlesApi.generate({ ...values, websiteId: parseInt(values.websiteId), siteAnalysis });
      notifications.show({ title: 'Articol generat!', message: `Articolul "${values.title}" a fost salvat ca draft.`, color: 'green', icon: <IconSparkles size={16} /> });
      aiForm.reset();
      close();
      await fetchData();
    } catch (error: any) {
      notifications.show({ title: 'Eroare la generare', message: error.response?.data?.details || 'A apărut o eroare', color: 'red' });
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleBulkGenerate = async (values: typeof bulkForm.values) => {
    const siteAnalysis = await checkSiteAnalysis(parseInt(values.websiteId));
    if (!siteAnalysis) {
      notifications.show({ title: 'Analiză site necesară', message: 'Rulează o analiză din secțiunea Websites înainte de a genera articole în bloc.', color: 'orange', autoClose: 8000, icon: <IconAlertCircle size={16} /> });
      return;
    }
    setBulkGenerateLoading(true);
    try {
      const response = await articlesApi.generateBulk({ ...values, websiteId: parseInt(values.websiteId), siteAnalysis });
      notifications.show({ title: 'Articole generate!', message: `${response.totalGenerated} articole au fost salvate ca draft.`, color: 'green', autoClose: 8000, icon: <IconSparkles size={16} /> });
      bulkForm.reset();
      close();
      await fetchData();
    } catch (error: any) {
      notifications.show({ title: 'Eroare la generarea în bloc', message: error.response?.data?.details || 'A apărut o eroare', color: 'red' });
    } finally {
      setBulkGenerateLoading(false);
    }
  };
  
  const handleDelete = async (articleId: number) => {
    try {
      await articlesApi.delete(articleId);
      notifications.show({ title: 'Articol șters!', color: 'green' });
      await fetchData();
    } catch (error: any) {
      notifications.show({ title: 'Eroare la ștergere', message: error.response?.data?.error, color: 'red' });
    }
  };

  const getStatusColor = (status: string) => ({ published: 'green', draft: 'orange', archived: 'gray' })[status] || 'blue';
  const getStatusLabel = (status: string) => ({ published: 'Publicat', draft: 'Draft', archived: 'Arhivat' })[status] || status;

  const websiteOptions = websites.map(website => ({ value: String(website.id), label: `${website.name} (${website.domain})` }));
  const keywordOptions = keywords.map(keyword => keyword.keyword);

  if (loading) {
    return <Center h="80vh"><Loader /></Center>;
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={1}>Articole</Title>
          <Text size="lg" c="dimmed">Generează și gestionează conținut optimizat SEO</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={open}>Creează Articol</Button>
      </Group>

      {articles.length === 0 ? (
        <Paper p="xl" ta="center" withBorder>
          <Stack align="center" gap="md">
            <ThemeIcon size={80} variant="light" color="orange"><IconArticle size={40} /></ThemeIcon>
            <Text size="xl" fw={500}>Niciun articol creat</Text>
            <Text size="sm" c="dimmed">Creează primul tău articol folosind inteligența artificială.</Text>
            <Button mt="md" onClick={open}>Creează Primul Articol</Button>
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
          {articles.map((article) => (
            <Card key={article.id} withBorder radius="md" p="lg" style={{ display: 'flex', flexDirection: 'column' }}>
              <Stack gap="md" style={{ flexGrow: 1 }}>
                <Group justify="space-between" align="flex-start">
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Text fw={500} size="lg" lineClamp={2}>{article.title}</Text>
                    <Text size="sm" c="dimmed">{article.website?.name}</Text>
                  </Stack>
                  <Menu shadow="md" width={200}>
                    <Menu.Target><ActionIcon variant="subtle" color="gray"><IconDots size={16} /></ActionIcon></Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEye size={14} />} onClick={() => router.push(`/dashboard/articles/${article.id}`)}>Vezi</Menu.Item>
                      <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => router.push(`/dashboard/articles/${article.id}/edit`)}>Editează</Menu.Item>
                      <Menu.Divider />
                      <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => handleDelete(article.id)}>Șterge</Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
                <Group justify="space-between">
                  <Badge color={getStatusColor(article.status)} variant="light">{getStatusLabel(article.status)}</Badge>
                  {article.seoScore && <Badge variant="outline">SEO: {article.seoScore}/100</Badge>}
                </Group>
                
                {Array.isArray(article.targetKeywords) && article.targetKeywords.length > 0 && (
                  <div>
                    <Text size="xs" c="dimmed" mb="xs">Keywords:</Text>
                    <Group gap="xs">
                      {article.targetKeywords.slice(0, 3).map((keyword, index) => <Badge key={index} size="xs" variant="outline">{keyword}</Badge>)}
                      {article.targetKeywords.length > 3 && <Badge size="xs" variant="outline" c="dimmed">+{article.targetKeywords.length - 3}</Badge>}
                    </Group>
                  </div>
                )}
                <Button variant="light" size="sm" mt="auto" onClick={() => router.push(`/dashboard/articles/${article.id}`)}>Vezi detalii</Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal opened={opened} onClose={close} title="Creează Articol Nou" size="lg" centered>
        <LoadingOverlay visible={generateLoading || bulkGenerateLoading} />
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="ai" leftSection={<IconRobot size={16} />}>Generare Ghidată</Tabs.Tab>
            <Tabs.Tab value="bulk" leftSection={<IconSparkles size={16} />}>Generare Autonomă</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="ai" pt="md">
            <form onSubmit={aiForm.onSubmit(handleAIGenerate)}>
              <Stack gap="md">
                <Alert icon={<IconSparkles size={16} />} title="Generare AI Ghidată">Tu alegi titlul și keywords-urile, AI-ul generează un articol optimizat.</Alert>
                <Select required label="Website" placeholder="Alege un website" data={websiteOptions} searchable {...aiForm.getInputProps('websiteId')} />
                <TextInput required label="Titlu Articol" placeholder="Ex: Ghid Complet SEO pentru Afaceri Mici" {...aiForm.getInputProps('title')} />
                <MultiSelect required label="Keywords Țintă" placeholder="Adaugă keywords pentru optimizare" data={keywordOptions} searchable creatable {...aiForm.getInputProps('targetKeywords')} />
                <SimpleGrid cols={2}>
                    <NumberInput label="Număr de cuvinte" min={500} max={5000} step={100} {...aiForm.getInputProps('articleLength')} />
                    <Select label="Tonul Articolului" data={['professional', 'casual', 'technical', 'conversational']} {...aiForm.getInputProps('tone')} />
                </SimpleGrid>
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={close}>Anulează</Button>
                    <Button type="submit" loading={generateLoading} leftSection={<IconBrandOpenai size={16}/>}>Generează cu AI</Button>
                </Group>
              </Stack>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="bulk" pt="md">
            <form onSubmit={bulkForm.onSubmit(handleBulkGenerate)}>
              <Stack gap="md">
                <Alert icon={<IconRobot size={16} />} color="purple" title="Generare Autonomă în Bloc">AI-ul analizează site-ul, alege subiecte și generează automat articole complete.</Alert>
                <Select required label="Website" placeholder="Alege un website pentru analiză și generare" data={websiteOptions} searchable {...bulkForm.getInputProps('websiteId')} />
                <NumberInput required label="Număr de articole de generat" min={1} max={20} {...bulkForm.getInputProps('numberOfArticles')} />
                <SimpleGrid cols={2}>
                    <Select label="Limbă" data={['romanian', 'english']} {...bulkForm.getInputProps('language')} />
                    <Select label="Tonul Articolelor" data={['professional', 'casual', 'technical']} {...bulkForm.getInputProps('tone')} />
                </SimpleGrid>
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={close}>Anulează</Button>
                    <Button type="submit" loading={bulkGenerateLoading} leftSection={<IconSparkles size={16}/>}>Generează {bulkForm.values.numberOfArticles} Articole</Button>
                </Group>
              </Stack>
            </form>
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </Stack>
  );
}
