'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Title,
  Button,
  Group,
  Stack,
  Card,
  Text,
  Badge,
  ActionIcon,
  Menu,
  Table,
  Progress,
  Alert,
  Modal,
  TextInput,
  LoadingOverlay,
  Center,
  Paper,
  ThemeIcon,
  SimpleGrid
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconDots,
  IconEdit,
  IconTrash,
  IconAnalyze,
  IconWorld,
  IconChartLine,
  IconSearch,
  IconEdit as IconArticle,
  IconAlertCircle,
  IconRefresh
} from '@tabler/icons-react';
import { useWebsiteStore } from '@/store/websiteStore';
import { useAuthStore } from '@/store/authStore';

export default function WebsitesPage() {
  const { websites, fetchWebsites, createWebsite, deleteWebsite, crawlWebsite, isLoading } = useWebsiteStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [selectedWebsite, setSelectedWebsite] = useState<any>(null);
  const [crawlingWebsites, setCrawlingWebsites] = useState<Set<number>>(new Set());

  const form = useForm({
    initialValues: {
      domain: '',
      name: '',
    },
    validate: {
      domain: (val) => {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
        if (!val) return 'Domeniul este obligatoriu';
        if (!domainRegex.test(val.replace(/^https?:\/\//, '').replace(/^www\./, ''))) {
          return 'Formatul domeniului este invalid';
        }
        return null;
      },
      name: (val) => (val.length < 2 ? 'Numele trebuie să aibă cel puțin 2 caractere' : null),
    },
  });

  useEffect(() => {
    fetchWebsites();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const cleanDomain = values.domain
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '');

      await createWebsite({
        domain: cleanDomain,
        name: values.name,
      });

      notifications.show({
        title: 'Website adăugat cu succes!',
        message: 'Website-ul a fost adăugat și va fi analizat în curând.',
        color: 'green',
      });

      form.reset();
      close();
    } catch (error: any) {
      notifications.show({
        title: 'Eroare la adăugarea website-ului',
        message: error.error || 'A apărut o eroare neașteptată',
        color: 'red',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedWebsite) return;

    try {
      await deleteWebsite(selectedWebsite.id);
      notifications.show({
        title: 'Website șters cu succes!',
        message: 'Website-ul și toate datele asociate au fost șterse.',
        color: 'green',
      });
      closeDelete();
      setSelectedWebsite(null);
    } catch (error: any) {
      notifications.show({
        title: 'Eroare la ștergerea website-ului',
        message: error.error || 'A apărut o eroare neașteptată',
        color: 'red',
      });
    }
  };

  const handleCrawl = async (website: any) => {
    setCrawlingWebsites(prev => new Set(prev).add(website.id));
    
    try {
      await crawlWebsite(website.id);
      notifications.show({
        title: 'Analiză inițiată!',
        message: `Analiza pentru ${website.name} a fost inițiată.`,
        color: 'blue',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Eroare la inițierea analizei',
        message: error.error || 'A apărut o eroare neașteptată',
        color: 'red',
      });
    } finally {
      setTimeout(() => {
        setCrawlingWebsites(prev => {
          const newSet = new Set(prev);
          newSet.delete(website.id);
          return newSet;
        });
      }, 3000);
    }
  };

  const getPlanLimits = () => {
    const limits = {
      starter: 3,
      professional: 15,
      enterprise: 999
    };
    return limits[user?.planType as keyof typeof limits] || 3;
  };

  const canAddWebsite = websites.length < getPlanLimits();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'crawling': return 'blue';
      case 'failed': return 'red';
      default: return 'orange';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Analizat';
      case 'crawling': return 'În analiză';
      case 'failed': return 'Eșuat';
      default: return 'În așteptare';
    }
  };

  if (isLoading && websites.length === 0) {
    return (
      <Center h="50vh">
        <Stack align="center" gap="md">
          <IconWorld size={48} color="gray" />
          <Text>Se încarcă website-urile...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={1}>Website-uri</Title>
          <Text size="lg" c="dimmed">
            Gestionează și analizează website-urile tale ({websites.length}/{getPlanLimits()})
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={open}
          disabled={!canAddWebsite}
        >
          Adaugă Website
        </Button>
      </Group>

      {!canAddWebsite && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="orange"
          title="Limită atinsă"
        >
          Ai atins limita de {getPlanLimits()} website-uri pentru planul {user?.planType}.
          <Button variant="subtle" size="xs" ml="xs" onClick={() => router.push('/dashboard/upgrade')}>
            Upgrade planul
          </Button>
        </Alert>
      )}

      {websites.length === 0 ? (
        <Paper p="xl" ta="center" bg="gray.0" radius="md">
          <Stack align="center" gap="md">
            <ThemeIcon size={80} variant="light" color="blue">
              <IconWorld size={40} />
            </ThemeIcon>
            <div>
              <Text size="xl" fw={500} mb="xs">
                Niciun website adăugat încă
              </Text>
              <Text size="sm" c="dimmed" mb="lg">
                Adaugă primul tău website pentru a începe analiza SEO și generarea de conținut
              </Text>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={open}
                size="md"
              >
                Adaugă primul website
              </Button>
            </div>
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
          {websites.map((website) => (
            <Card key={website.id} withBorder radius="md" p="lg">
              <Stack gap="md">
                <Group justify="space-between">
                  <div>
                    <Text fw={500} size="lg" lineClamp={1}>
                      {website.name}
                    </Text>
                    <Text size="sm" c="blue" lineClamp={1}>
                      {website.domain}
                    </Text>
                  </div>
                  <Menu shadow="md" width={200}>
                    <Menu.Target>
                      <ActionIcon variant="subtle">
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconAnalyze size={14} />}
                        onClick={() => handleCrawl(website)}
                        disabled={crawlingWebsites.has(website.id)}
                      >
                        {crawlingWebsites.has(website.id) ? 'Analizând...' : 'Analizează'}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconChartLine size={14} />}
                        onClick={() => router.push(`/dashboard/websites/${website.id}/analytics`)}
                      >
                        Vezi analize
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={() => router.push(`/dashboard/websites/${website.id}/edit`)}
                      >
                        Editează
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => {
                          setSelectedWebsite(website);
                          openDelete();
                        }}
                      >
                        Șterge
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>

                <Group justify="space-between">
                  <Badge
                    color={getStatusColor(website.crawlStatus)}
                    variant="light"
                  >
                    {getStatusLabel(website.crawlStatus)}
                  </Badge>
                  {website.isVerified && (
                    <Badge color="green" variant="outline" size="sm">
                      Verificat
                    </Badge>
                  )}
                </Group>

                <SimpleGrid cols={3} spacing="xs">
                  <div>
                    <Text size="xs" c="dimmed" ta="center">
                      Keywords
                    </Text>
                    <Text size="lg" fw={700} ta="center">
                      {website.stats?.totalKeywords || 0}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" ta="center">
                      Articole
                    </Text>
                    <Text size="lg" fw={700} ta="center">
                      {website.stats?.totalArticles || 0}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" ta="center">
                      Ultimul crawl
                    </Text>
                    <Text size="xs" ta="center">
                      {website.lastCrawledAt
                        ? new Date(website.lastCrawledAt).toLocaleDateString('ro-RO', {
                            day: '2-digit',
                            month: '2-digit'
                          })
                        : 'Niciodată'
                      }
                    </Text>
                  </div>
                </SimpleGrid>

                <Group grow>
                  <Button
                    variant="light"
                    size="sm"
                    leftSection={<IconChartLine size={14} />}
                    onClick={() => router.push(`/dashboard/websites/${website.id}`)}
                  >
                    Detalii
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftSection={<IconRefresh size={14} />}
                    onClick={() => handleCrawl(website)}
                    loading={crawlingWebsites.has(website.id)}
                  >
                    Analizează
                  </Button>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Add Website Modal */}
      <Modal opened={opened} onClose={close} title="Adaugă Website Nou" size="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              required
              label="Nume Website"
              placeholder="Ex: Blog Personal, Site Companie"
              {...form.getInputProps('name')}
            />
            <TextInput
              required
              label="Domeniu"
              placeholder="exemplu.ro"
              description="Introdu doar domeniul, fără http:// sau www."
              {...form.getInputProps('domain')}
            />
            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={close}>
                Anulează
              </Button>
              <Button type="submit">
                Adaugă Website
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDelete}
        title="Confirmă ștergerea"
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Ești sigur că vrei să ștergi website-ul{' '}
            <Text component="span" fw={500}>
              {selectedWebsite?.name}
            </Text>
            ?
          </Text>
          <Text size="sm" c="dimmed">
            Această acțiune va șterge permanent toate datele asociate (keywords, articole, analize).
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={closeDelete}>
              Anulează
            </Button>
            <Button color="red" onClick={handleDelete}>
              Șterge Website
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}