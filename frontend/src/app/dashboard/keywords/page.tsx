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
import { IconSearch, IconPlus, IconBrain, IconSparkles, IconWorld, IconTrash } from '@tabler/icons-react';
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
  // Folosim Zustand store pentru a gestiona starea keyword-urilor
  const { keywords, fetchKeywords, createKeyword, deleteKeyword, isLoading: isStoreLoading } = useKeywordStore();

  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchResults, setResearchResults] = useState<KeywordResearchResult | null>(null);
  const [addModalOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [researchModalOpened, { open: openResearch, close: closeResearch }] = useDisclosure(false);
  const [autoModalOpened, { open: openAuto, close: closeAuto }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [aiProviders, setAiProviders] = useState<{ providers: any; available: string[]; defaultProvider: string | null }>({ providers: {}, available: [], defaultProvider: null });

  const addForm = useForm({
    initialValues: { websiteId: '', keyword: '' },
    validate: {
      websiteId: (val) => !val ? 'Selectează un website' : null,
      keyword: (val) => val.length < 2 ? 'Cuvântul cheie este prea scurt' : null,
    },
  });

  const researchForm = useForm({
    initialValues: {
      seedKeyword: '', websiteId: '', language: 'ro',
      maxSuggestions: 10, aiProvider: '',
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
            researchForm.setFieldValue('aiProvider', res.defaultProvider);
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

  const handleResearch = async (values: typeof researchForm.values) => {
    if (!values.seedKeyword && !values.websiteId) {
      notifications.show({ title: 'Input invalid', message: 'Te rog selectează un website sau introdu un cuvânt cheie.', color: 'yellow' });
      return;
    }
    setResearchLoading(true);
    setResearchResults(null);
    setSelectedKeywords(new Set());
    try {
      const response = await keywordsApi.research({
        language: values.language,
        maxSuggestions: values.maxSuggestions,
        ...(values.websiteId && { websiteId: parseInt(values.websiteId) }),
        ...(!values.websiteId && { seedKeyword: values.seedKeyword })
      });
      setResearchResults(response.research);
    } catch (error: any) {
      notifications.show({ title: 'Eroare la research', message: error.response?.data?.error || 'A apărut o eroare', color: 'red' });
    } finally {
      setResearchLoading(false);
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

  const handleBulkImport = async (websiteId: string | null) => {
    if (!websiteId || selectedKeywords.size === 0) return;
    setIsImporting(true);
    try {
      const response = await keywordsApi.bulkImport({
        websiteId: parseInt(websiteId),
        keywords: Array.from(selectedKeywords),
      });
      notifications.show({ title: 'Import reușit!', message: `${response.imported} cuvinte cheie noi au fost adăugate.`, color: 'green' });
      setSelectedKeywords(new Set());
      closeResearch();
      fetchKeywords();
    } catch (error: any) {
      notifications.show({ title: 'Eroare la import', message: error.response?.data?.error, color: 'red' });
    } finally {
      setIsImporting(false);
    }
  };

  const toggleKeywordSelection = (keyword: string) => {
    setSelectedKeywords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyword)) newSet.delete(keyword); else newSet.add(keyword);
      return newSet;
    });
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
          <Button variant="outline" leftSection={<IconBrain size={16} />} onClick={() => { setResearchResults(null); researchForm.reset(); openResearch(); }}>Research AI</Button>
          <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>Adaugă Manual</Button>
        </Group>
      </Group>

      {keywords.length === 0 && websites.length > 0 ? (
        <Paper p="xl" ta="center" withBorder><Stack align="center" gap="md"><ThemeIcon size={80} variant="light" color="blue"><IconSearch size={40} /></ThemeIcon><div><Text size="xl" fw={500} mb="xs">Niciun keyword adăugat</Text><Text size="sm" c="dimmed" mb="lg">Folosește Auto pentru extragere automată cu AI sau cercetează manual keywords.</Text><Group justify="center"><Button leftSection={<IconSparkles size={16} />} onClick={openAuto}>Auto</Button><Button leftSection={<IconBrain size={16} />} onClick={openResearch} variant="outline">Research AI</Button><Button leftSection={<IconPlus size={16} />} onClick={openAdd}>Adaugă Manual</Button></Group></div></Stack></Paper>
      ) : websites.length === 0 ? (
        <Paper p="xl" ta="center" withBorder><Stack align="center" gap="md"><ThemeIcon size={80} variant="light" color="blue"><IconWorld size={40} /></ThemeIcon><div><Text size="xl" fw={500} mb="xs">Niciun website adăugat</Text><Text size="sm" c="dimmed" mb="lg">Trebuie să adaugi un website înainte de a putea gestiona cuvinte cheie.</Text><Button onClick={() => router.push('/dashboard/websites/new')}>Adaugă Primul Website</Button></div></Stack></Paper>
      ) : (
        <Card withBorder radius="md" p={0}>
          <LoadingOverlay visible={isStoreLoading} />
          <Table.ScrollContainer minWidth={800}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Keyword</Table.Th>
                  <Table.Th>Website</Table.Th>
                  <Table.Th>Volum Căutare</Table.Th>
                  <Table.Th>Dificultate</Table.Th>
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
                    <Table.Td><Badge color={kw.currentPosition && kw.currentPosition <= 10 ? 'green' : 'gray'} variant="light">#{kw.currentPosition || '-'}</Badge></Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
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

      <Modal opened={researchModalOpened} onClose={closeResearch} title="Research Keywords cu AI" size="xl">
        <LoadingOverlay visible={researchLoading || isImporting} />
        {!researchResults ? (
          <form onSubmit={researchForm.onSubmit(handleResearch)}>
            <Stack>
              <Alert icon={<IconSparkles size={16} />} title="Cum funcționează?">
                Selectează un website pentru a genera automat idei de keywords bazate pe conținutul său, sau introdu un cuvânt cheie manual. AI-ul va genera o listă dublă de sugestii, le va analiza prin API-uri externe și va selecta cele mai bune oportunități.
              </Alert>
              <Select label="Bazează research-ul pe un website analizat" placeholder="Selectează un website" data={websiteOptions} clearable {...researchForm.getInputProps('websiteId')} />
              <TextInput label="Sau introdu un cuvânt cheie manual" placeholder="Ex: marketing digital" disabled={!!researchForm.values.websiteId} {...researchForm.getInputProps('seedKeyword')} />
              <Group grow>
                <Select label="AI Provider" placeholder="Auto-select" data={aiProviderOptions} clearable {...researchForm.getInputProps('aiProvider')} />
                <NumberInput label="Câte rezultate dorești?" min={5} max={100} {...researchForm.getInputProps('maxSuggestions')} />
              </Group>
              <Group justify="flex-end" mt="md"><Button type="submit">Începe Research</Button></Group>
            </Stack>
          </form>
        ) : (
          <Stack>
            <Alert icon={<IconBrain size={16} />} color="blue" title="Sumar Strategic AI">
              {researchResults.aiSummary || "Analiza a fost finalizată."}
            </Alert>
            <Group justify="space-between">
              <Text>Rezultate pentru: <strong>{researchResults.originalSeed}</strong></Text>
              <Group>
                <Text size="sm" c="dimmed">{selectedKeywords.size} selectate</Text>
                <Select placeholder="Importă în..." data={websiteOptions} disabled={selectedKeywords.size === 0} onChange={handleBulkImport} />
              </Group>
            </Group>
            <Card withBorder p={0}>
              <Table.ScrollContainer minWidth={600} h={400}>
                <Table verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr><Table.Th w={40}><Checkbox onChange={(e) => setSelectedKeywords(e.currentTarget.checked ? new Set(researchResults.keywords.map(k => k.keyword)) : new Set())} /></Table.Th><Table.Th>Keyword</Table.Th><Table.Th>Volum</Table.Th><Table.Th>Dificultate</Table.Th><Table.Th>Scor</Table.Th><Table.Th>Justificare AI</Table.Th></Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {researchResults.keywords.map((kw, i) => (
                      <Table.Tr key={i} onClick={() => toggleKeywordSelection(kw.keyword)} bg={selectedKeywords.has(kw.keyword) ? 'var(--mantine-color-blue-0)' : undefined} style={{ cursor: 'pointer' }}>
                        <Table.Td><Checkbox checked={selectedKeywords.has(kw.keyword)} readOnly tabIndex={-1} /></Table.Td>
                        <Table.Td><Text size="sm">{kw.keyword}</Text></Table.Td>
                        <Table.Td>{kw.searchVolume || 'N/A'}</Table.Td>
                        <Table.Td><Badge color={kw.difficulty <= 30 ? 'green' : kw.difficulty <= 60 ? 'orange' : 'red'}>{kw.difficulty || 'N/A'}</Badge></Table.Td>
                        <Table.Td><Badge color="green" variant="light">{kw.score}</Badge></Table.Td>
                        <Table.Td><Text size="xs" maw={300}>{kw.justification}</Text></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Card>
          </Stack>
        )}
      </Modal>

      <Modal opened={autoModalOpened} onClose={closeAuto} title="Auto Research Keywords" size="lg">
        <LoadingOverlay visible={researchLoading} />
        <form onSubmit={autoForm.onSubmit(handleAutoResearch)}>
          <Stack>
            <Alert icon={<IconSparkles size={16} />} title="Auto Research cu AI" color="blue">
              Această funcționalitate va extrage automat keyword-uri de pe site-ul selectat, le va analiza și va importa automat cele mai valoroase.
            </Alert>
            <Select required label="Website pentru analiză" placeholder="Selectează website-ul" data={websiteOptions} {...autoForm.getInputProps('websiteId')} />
            <Group grow>
              <Select label="AI Provider" placeholder={aiProviders.defaultProvider ? `Default: ${aiProviders.providers[aiProviders.defaultProvider]?.name}` : "Auto-select"} data={aiProviderOptions} clearable {...autoForm.getInputProps('aiProvider')} />
              <Select label="Limba" data={[{ value: 'ro', label: 'Română' }, { value: 'en', label: 'Engleză' }]} {...autoForm.getInputProps('language')} />
            </Group>
            <NumberInput label="Numărul maxim de rezultate de importat" description="Keyword-urile cu scorul cel mai mare vor fi importate automat" min={5} max={150} {...autoForm.getInputProps('maxSuggestions')} />
            <Group justify="space-between" mt="md">
              <Text size="sm" c="dimmed">Se vor genera ~{autoForm.values.maxSuggestions * 2} idei pentru analiză</Text>
              <Group>
                <Button variant="default" onClick={closeAuto}>Anulează</Button>
                <Button type="submit" disabled={aiProviders.available.length === 0} leftSection={<IconSparkles size={16} />}>Începe Auto Research</Button>
              </Group>
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