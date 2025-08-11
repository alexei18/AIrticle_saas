'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Card,
  Stack,
  Text,
  TextInput,
  Button,
  Group,
  PasswordInput,
  Select,
  Switch,
  Divider,
  Alert,
  Badge,
  Progress,
  SimpleGrid,
  Paper,
  ThemeIcon,
  Tabs
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconUser,
  IconLock,
  IconBell,
  IconCreditCard,
  IconShield,
  IconKey,
  IconMail,
  IconCheck,
  IconAlertCircle
} from '@tabler/icons-react';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
  const { user, updateProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('profile');

  const profileForm = useForm({
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
    validate: {
      firstName: (val) => (val.length < 2 ? 'Prenumele trebuie să aibă cel puțin 2 caractere' : null),
      lastName: (val) => (val.length < 2 ? 'Numele trebuie să aibă cel puțin 2 caractere' : null),
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Email invalid'),
    },
  });

  const passwordForm = useForm({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      currentPassword: (val) => (val.length < 6 ? 'Parola curentă este obligatorie' : null),
      newPassword: (val) => (val.length < 8 ? 'Parola nouă trebuie să aibă cel puțin 8 caractere' : null),
      confirmPassword: (val, values) =>
        val !== values.newPassword ? 'Parolele nu se potrivesc' : null,
    },
  });

  const notificationForm = useForm({
    initialValues: {
      emailNotifications: true,
      crawlNotifications: true,
      keywordAlerts: false,
      weeklyReports: true,
      marketingEmails: false,
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.setValues({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
  }, [user]);

  const handleProfileUpdate = async (values: typeof profileForm.values) => {
    setLoading(true);
    try {
      await updateProfile(values);
      notifications.show({
        title: 'Profil actualizat cu succes!',
        message: 'Informațiile tale au fost salvate.',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Eroare la actualizarea profilului',
        message: error.error || 'A apărut o eroare neașteptată',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (values: typeof passwordForm.values) => {
    setLoading(true);
    try {
      // API call for password update would go here
      notifications.show({
        title: 'Parola actualizată cu succes!',
        message: 'Parola ta a fost schimbată.',
        color: 'green',
      });
      passwordForm.reset();
    } catch (error: any) {
      notifications.show({
        title: 'Eroare la actualizarea parolei',
        message: error.error || 'A apărut o eroare neașteptată',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async (values: typeof notificationForm.values) => {
    setLoading(true);
    try {
      // API call for notification settings would go here
      notifications.show({
        title: 'Setări notificări salvate!',
        message: 'Preferințele tale au fost actualizate.',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Eroare la salvarea setărilor',
        message: error.error || 'A apărut o eroare neașteptată',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanInfo = () => {
    const planInfo = {
      starter: {
        name: 'Starter',
        price: '€79/lună',
        websites: 3,
        articles: 25,
        keywords: 500,
        color: 'blue'
      },
      professional: {
        name: 'Professional',
        price: '€199/lună',
        websites: 15,
        articles: 100,
        keywords: 2000,
        color: 'green'
      },
      enterprise: {
        name: 'Enterprise',
        price: '€499/lună',
        websites: 999,
        articles: 500,
        keywords: 999999,
        color: 'purple'
      }
    };
    
    return planInfo[user?.planType as keyof typeof planInfo] || planInfo.starter;
  };

  const currentPlan = getPlanInfo();

  return (
    <Stack gap="xl">
      <div>
        <Title order={1}>Setări</Title>
        <Text size="lg" c="dimmed">
          Gestionează contul și preferințele tale
        </Text>
      </div>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
            Profil
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>
            Securitate
          </Tabs.Tab>
          <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>
            Notificări
          </Tabs.Tab>
          <Tabs.Tab value="billing" leftSection={<IconCreditCard size={16} />}>
            Plan & Facturare
          </Tabs.Tab>
          <Tabs.Tab value="api" leftSection={<IconKey size={16} />}>
            API Keys
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="lg">
          <Card withBorder radius="md" p="lg">
            <Title order={3} mb="md">Informații Personale</Title>
            <form onSubmit={profileForm.onSubmit(handleProfileUpdate)}>
              <Stack gap="md">
                <Group grow>
                  <TextInput
                    label="Prenume"
                    placeholder="Ion"
                    {...profileForm.getInputProps('firstName')}
                  />
                  <TextInput
                    label="Nume"
                    placeholder="Popescu"
                    {...profileForm.getInputProps('lastName')}
                  />
                </Group>

                <TextInput
                  label="Email"
                  placeholder="ion@exemplu.com"
                  leftSection={<IconMail size={16} />}
                  {...profileForm.getInputProps('email')}
                />

                <Group justify="flex-end">
                  <Button type="submit" loading={loading}>
                    Salvează modificările
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="security" pt="lg">
          <Stack gap="lg">
            <Card withBorder radius="md" p="lg">
              <Title order={3} mb="md">Schimbare Parolă</Title>
              <form onSubmit={passwordForm.onSubmit(handlePasswordUpdate)}>
                <Stack gap="md">
                  <PasswordInput
                    required
                    label="Parola curentă"
                    placeholder="Parola curentă"
                    {...passwordForm.getInputProps('currentPassword')}
                  />
                  <PasswordInput
                    required
                    label="Parola nouă"
                    placeholder="Parola nouă"
                    {...passwordForm.getInputProps('newPassword')}
                  />
                  <PasswordInput
                    required
                    label="Confirmă parola nouă"
                    placeholder="Confirmă parola nouă"
                    {...passwordForm.getInputProps('confirmPassword')}
                  />

                  <Group justify="flex-end">
                    <Button type="submit" loading={loading}>
                      Actualizează parola
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Title order={3} mb="md">Securitate Cont</Title>
              <Stack gap="md">
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>Autentificare cu doi factori</Text>
                    <Text size="sm" c="dimmed">
                      Adaugă un nivel suplimentar de securitate contului tău
                    </Text>
                  </div>
                  <Button variant="outline" disabled>
                    În curând
                  </Button>
                </Group>

                <Divider />

                <Group justify="space-between">
                  <div>
                    <Text fw={500}>Email verificat</Text>
                    <Text size="sm" c="dimmed">
                      Adresa ta de email a fost verificată
                    </Text>
                  </div>
                  <Badge 
                    color={user?.emailVerified ? 'green' : 'orange'}
                    leftSection={user?.emailVerified ? <IconCheck size={12} /> : <IconAlertCircle size={12} />}
                  >
                    {user?.emailVerified ? 'Verificat' : 'Neverificat'}
                  </Badge>
                </Group>
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="notifications" pt="lg">
          <Card withBorder radius="md" p="lg">
            <Title order={3} mb="md">Preferințe Notificări</Title>
            <form onSubmit={notificationForm.onSubmit(handleNotificationUpdate)}>
              <Stack gap="lg">
                <div>
                  <Text fw={500} mb="sm">Notificări Email</Text>
                  <Stack gap="md">
                    <Switch
                      label="Notificări generale"
                      description="Primește actualizări importante despre cont"
                      {...notificationForm.getInputProps('emailNotifications', { type: 'checkbox' })}
                    />
                    <Switch
                      label="Notificări crawling"
                      description="Primește notificări când se finalizează analiza unui website"
                      {...notificationForm.getInputProps('crawlNotifications', { type: 'checkbox' })}
                    />
                    <Switch
                      label="Alerte keywords"
                      description="Primește alerte când keywords-urile tale schimbă pozițiile"
                      {...notificationForm.getInputProps('keywordAlerts', { type: 'checkbox' })}
                    />
                  </Stack>
                </div>

                <Divider />

                <div>
                  <Text fw={500} mb="sm">Rapoarte</Text>
                  <Stack gap="md">
                    <Switch
                      label="Rapoarte săptămânale"
                      description="Primește un rezumat săptămânal cu performanțele tale SEO"
                      {...notificationForm.getInputProps('weeklyReports', { type: 'checkbox' })}
                    />
                    <Switch
                      label="Email-uri marketing"
                      description="Primește sfaturi SEO și actualizări despre funcționalități noi"
                      {...notificationForm.getInputProps('marketingEmails', { type: 'checkbox' })}
                    />
                  </Stack>
                </div>

                <Group justify="flex-end">
                  <Button type="submit" loading={loading}>
                    Salvează preferințele
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="billing" pt="lg">
          <Stack gap="lg">
            <Card withBorder radius="md" p="lg">
              <Group justify="space-between" mb="md">
                <Title order={3}>Planul Curent</Title>
                <Badge size="lg" color={currentPlan.color} variant="light">
                  {currentPlan.name}
                </Badge>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
                <Paper p="md" bg="gray.0" radius="md">
                  <Text size="sm" c="dimmed">Website-uri</Text>
                  <Text size="xl" fw={700}>{currentPlan.websites === 999 ? '∞' : currentPlan.websites}</Text>
                </Paper>
                <Paper p="md" bg="gray.0" radius="md">
                  <Text size="sm" c="dimmed">Articole/lună</Text>
                  <Text size="xl" fw={700}>{currentPlan.articles}</Text>
                </Paper>
                <Paper p="md" bg="gray.0" radius="md">
                  <Text size="sm" c="dimmed">Keywords</Text>
                  <Text size="xl" fw={700}>{currentPlan.keywords === 999999 ? '∞' : currentPlan.keywords.toLocaleString()}</Text>
                </Paper>
              </SimpleGrid>

              <Group justify="space-between">
                <div>
                  <Text fw={500} size="lg">{currentPlan.price}</Text>
                  {user?.trialEndsAt && new Date(user.trialEndsAt) > new Date() && (
                    <Text size="sm" c="orange">
                      Probă gratuită până la {new Date(user.trialEndsAt).toLocaleDateString('ro-RO')}
                    </Text>
                  )}
                </div>
                <Button variant="outline">
                  Upgrade Plan
                </Button>
              </Group>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Title order={3} mb="md">Istoric Facturare</Title>
              <Alert color="blue" variant="light">
                Funcționalitatea de facturare va fi disponibilă în curând.
                Momentan poți folosi platforma în perioada de probă gratuită.
              </Alert>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="api" pt="lg">
          <Card withBorder radius="md" p="lg">
            <Title order={3} mb="md">API Keys</Title>
            <Stack gap="md">
              <Alert
                icon={<IconShield size={16} />}
                color="blue"
                variant="light"
                title="Configurare API Keys pentru AI"
              >
                Pentru a folosi funcționalitățile AI, configurează-ți propriile API keys.
                Acestea sunt stocate securizat și folosite doar pentru generarea conținutului tău.
              </Alert>

              <TextInput
                label="OpenAI API Key"
                placeholder="sk-..."
                description="Pentru generarea de conținut cu GPT-4"
                type="password"
                disabled
              />

              <TextInput
                label="Anthropic API Key (Claude)"
                placeholder="sk-ant-..."
                description="Pentru generarea de conținut cu Claude"
                type="password"
                disabled
              />

              <Alert color="orange" variant="light">
                Configurarea API keys personale va fi disponibilă în versiunea Pro.
                Momentan folosim serviciile noastre AI incluse în plan.
              </Alert>

              <Group justify="flex-end">
                <Button disabled>
                  Salvează API Keys
                </Button>
              </Group>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}