'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Title, Button, Group, Stack, Card, Text, Badge, Table, Modal, TextInput,
  Select, NumberInput, LoadingOverlay, Center, Paper, ThemeIcon, Alert, Checkbox,
  Loader, ActionIcon, Tooltip
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconPlus, IconBrain, IconSparkles, IconWorld, IconTrash, IconChartLine } from '@tabler/icons-react';
import { keywordsApi, websitesApi } from '@/lib/api';
import { Keyword, Website } from '@/types';
import { useKeywordStore } from '@/store/keywordStore';

interface KeywordResearchResult {
  originalSeed: string;
  totalFound: number;
  keywords: {
    keyword: string;
    searchVolume: number;
    difficulty: number;
    score: number;
    justification?: string;
  }[];
  aiSummary?: string;
}

export default function KeywordsPage() {
  const router = useRouter();
  const { keywords, fetchKeywords, createKeyword, deleteKeyword, updateKeywordState, isLoading: isStoreLoading } = useKeywordStore();

  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [researchLoading, setResearchLoading] = useState(false);
  const [addModalOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [autoModalOpened, { open: openAuto, close: closeAuto }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);
  const [aiProviders, setAiProviders] = useState<{ providers: any; available: string[]; defaultProvider: string | null }>({ providers: {}, available: [], defaultProvider: null });
  const [calculatingTrendId, setCalculatingTrendId] = useState<number | null>(null);

  const addForm = useForm({
    initialValues: { websiteId: '', keyword: '' },
    validate: {
      websiteId: (val) => !val ? 'Selectează un website' : null,
      keyword: (val) => val.length < 2 ? 'Cuvântul cheie este prea scurt' : null,
    },
  });

  const autoForm = useForm({
    initialValues: {
      websiteId: '', language: 'ro', aiProvider: '', maxSuggestions: 20,
    },
    validate: {
      websiteId: (val) => !val ? 'Selectează un website' : null,
    },
  });

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchKeywords(),
        websitesApi.getAll().then(res => setWebsites(res.websites || [])),
        keywordsApi.getAIStatus().then(res => {
          setAiProviders(res);
          if (res.defaultProvider) {
            autoForm.setFieldValue('aiProvider', res.defaultProvider);
          }
        })
      ]);
    } catch (error) {
      notifications.show({ title: 'Eroare', message: 'Nu s-au putut încărca datele inițiale.', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [fetchKeywords]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleAddKeyword = async (values: typeof addForm.values) => {
    try {
      await createKeyword({
        websiteId: parseInt(values.websiteId),
        keyword: values.keyword,
      });
      notifications.show({ title: 'Succes!', message: 'Cuvântul cheie a fost adăugat.', color: 'green' });
      closeAdd();
      addForm.reset();
    } catch (error: any) {
      notifications.show({ title: 'Eroare', message: error.response?.data?.error || 'A apărut o eroare', color: 'red' });
    }
  };

  const handleAutoResearch = async (values: typeof autoForm.values) => {
    setResearchLoading(true);
    try {
      const response = await keywordsApi.autoResearch({
        websiteId: parseInt(values.websiteId),
        language: values.language,
        aiProvider: values.aiProvider || undefined,
        maxSuggestions: values.maxSuggestions,
      });
      notifications.show({
        title: 'Auto Research Completat!',
        message: `${response.automation.autoImported} keyword-uri adăugate automat.`,
        color: 'green'
      });
      closeAuto();
      fetchKeywords();
      autoForm.reset();
    } catch (error: any) {
      notifications.show({ title: 'Eroare la Auto Research', message: error.response?.data?.error || 'A apărut o eroare', color: 'red' });
    } finally {
      setResearchLoading(false);
    }
  };

  const handleDeleteClick = (keyword: Keyword) => {
    setSelectedKeyword(keyword);
    openDelete();
  };

  const handleConfirmDelete = async () => {
    if (!selectedKeyword) return;
    try {
      await deleteKeyword(selectedKeyword.id);
      notifications.show({ title: 'Succes!', message: 'Keyword-ul a fost șters.', color: 'green' });
      closeDelete();
    } catch (error) {
      notifications.show({ title: 'Eroare', message: 'Nu s-a putut șterge keyword-ul.', color: 'red' });
    }
  };

  const handleCalculateTrendScore = async (keywordId: number) => {
    setCalculatingTrendId(keywordId);
    try {
      const response = await keywordsApi.calculateTrendScore(keywordId);
      updateKeywordState(response.keyword);
      notifications.show({ title: 'Succes!', message: `Scorul AI Trend pentru "${response.keyword.keyword}" este ${response.aiTrendScore}.`, color: 'green' });
    } catch (error: any) {
      notifications.show({ title: 'Eroare', message: error.response?.data?.message || 'Nu s-a putut calcula scorul.', color: 'red' });
    } finally {
      setCalculatingTrendId(null);
    }
  };

  const websiteOptions = useMemo(() => websites.map(w => ({ value: String(w.id), label: `${w.name} (${w.domain})` })), [websites]);
  const aiProviderOptions = useMemo(() => aiProviders.available.map(provider => ({ value: provider, label: aiProviders.providers[provider]?.name || provider })), [aiProviders]);

  if (loading) return <Center h="50vh"><Loader /></Center>;

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={1}>Keywords</Title>
          <Text c="dimmed">Cercetează și monitorizează cuvintele cheie</Text>
        </div>
        <Group>
          <Button variant="filled" leftSection={<IconSparkles size={16} />} onClick={openAuto} disabled={websites.length === 0}>Auto</Button>
          <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>Adaugă Manual</Button>
        </Group>
      </Group>

      {keywords.length === 0 && websites.length > 0 ? (
        <Paper p="xl" ta="center" withBorder><Stack align="center" gap="md"><ThemeIcon size={80} variant="light" color="blue"><IconSearch size={40} /></ThemeIcon><div><Text size="xl" fw={500} mb="xs">Niciun keyword adăugat</Text><Text size="sm" c="dimmed" mb="lg">Folosește Auto pentru extragere automată cu AI sau cercetează manual keywords.</Text><Group justify="center"><Button leftSection={<IconSparkles size={16} />} onClick={openAuto}>Auto</Button><Button leftSection={<IconPlus size={16} />} onClick={openAdd}>Adaugă Manual</Button></Group></div></Stack></Paper>
      ) : websites.length === 0 ? (
        <Paper p="xl" ta="center" withBorder><Stack align="center" gap="md"><ThemeIcon size={80} variant="light" color="blue"><IconWorld size={40} /></ThemeIcon><div><Text size="xl" fw={500} mb="xs">Niciun website adăugat</Text><Text size="sm" c="dimmed" mb="lg">Trebuie să adaugi un website înainte de a putea gestiona cuvinte cheie.</Text><Button onClick={() => router.push('/dashboard/websites/new')}>Adaugă Primul Website</Button></div></Stack></Paper>
      ) : (
        <Card withBorder radius="md" p={0}>
          <LoadingOverlay visible={isStoreLoading} />
          <Table.ScrollContainer minWidth={900}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Keyword</Table.Th>
                  <Table.Th>Website</Table.Th>
                  <Table.Th>Volum Căutare</Table.Th>
                  <Table.Th>Dificultate</Table.Th>
                  <Table.Th>Scor AI Trend</Table.Th>
                  <Table.Th>Poziție Curentă</Table.Th>
                  <Table.Th ta="right">Acțiuni</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {keywords.map((kw) => (
                  <Table.Tr key={kw.id}>
                    <Table.Td><Text fw={500}>{kw.keyword}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{kw.website?.name}</Text></Table.Td>
                    <Table.Td>{kw.searchVolume?.toLocaleString() || '-'}</Table.Td>
                    <Table.Td>{kw.difficultyScore || '-'}</Table.Td>
                    <Table.Td>
                      {kw.aiTrendScore ? (
                        <Badge color="purple" variant="light">{kw.aiTrendScore}</Badge>
                      ) : (
                        <Text size="sm" c="dimmed">-</Text>
                      )}
                    </Table.Td>
                    <Table.Td><Badge color={kw.currentPosition && kw.currentPosition <= 10 ? 'green' : 'gray'} variant="light">#{kw.currentPosition || '-'}</Badge></Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <Tooltip label="Calculează Scor AI Trend">
                          <ActionIcon 
                            color="purple" 
                            variant="subtle" 
                            onClick={() => handleCalculateTrendScore(kw.id)}
                            loading={calculatingTrendId === kw.id}
                          >
                            <IconChartLine size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Șterge Keyword">
                          <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteClick(kw)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}

      <Modal opened={addModalOpened} onClose={closeAdd} title="Adaugă Keyword Manual">
        <form onSubmit={addForm.onSubmit(handleAddKeyword)}>
          <Stack gap="md">
            <Select required label="Website" placeholder="Selectează website-ul" data={websiteOptions} {...addForm.getInputProps('websiteId')} />
            <TextInput required label="Keyword" placeholder="Ex: optimizare seo" {...addForm.getInputProps('keyword')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeAdd}>Anulează</Button>
              <Button type="submit">Adaugă</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={deleteModalOpened} onClose={closeDelete} title="Confirmă Ștergerea" size="md">
        <Stack>
          <Text>Ești sigur că vrei să ștergi keyword-ul <Text span fw={700}>"{selectedKeyword?.keyword}"</Text>?</Text>
          <Text c="dimmed" size="sm">Această acțiune este ireversibilă și va șterge și istoricul de poziții.</Text>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeDelete}>Anulează</Button>
            <Button color="red" onClick={handleConfirmDelete}>Șterge</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}