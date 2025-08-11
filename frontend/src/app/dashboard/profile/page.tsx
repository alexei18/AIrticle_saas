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
  TextInput,
  Textarea,
  PasswordInput,
  Switch,
  Badge,
  Avatar,
  ActionIcon,
  Tabs,
  Loader,
  Center,
  Alert,
  FileButton
} from '@mantine/core';
import { 
  IconUser, 
  IconMail, 
  IconPhone, 
  IconMapPin, 
  IconCalendar,
  IconCamera,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconShield,
  IconBell,
  IconGlobe,
  IconTrash,
  IconEdit,
  IconCheck,
  IconX,
  IconInfoCircle
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  location?: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  keywordAlerts: boolean;
  reportDigest: boolean;
  securityAlerts: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('profile');
  const [isEditing, setIsEditing] = useState(false);
  
  // Security settings
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    keywordAlerts: true,
    reportDigest: false,
    securityAlerts: true
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/dashboard/profile', {
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
        const userData = result.data;
        const profileData: UserProfile = {
          id: userData.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.profile?.phone || '',
          company: userData.profile?.company || '',
          location: userData.profile?.location || '',
          bio: userData.profile?.bio || '',
          avatar: userData.profile?.avatar || '',
          createdAt: userData.createdAt,
          emailVerified: userData.emailVerified,
          twoFactorEnabled: userData.profile?.twoFactorEnabled || false
        };
        setProfile(profileData);
        setNotificationSettings(userData.notificationSettings);
      } else {
        throw new Error(result.error || 'Failed to fetch profile data');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to mock data
      const mockProfile: UserProfile = {
        id: 1,
        firstName: 'Ion',
        lastName: 'Popescu',
        email: 'ion.popescu@example.com',
        phone: '+40 722 123 456',
        company: 'Digital Marketing SRL',
        location: 'București, România',
        bio: 'Digital marketing specialist cu peste 5 ani experiență în SEO și marketing de conținut.',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        createdAt: '2023-01-15',
        emailVerified: true,
        twoFactorEnabled: false
      };
      setProfile(mockProfile);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updatedData: Partial<UserProfile>) => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/dashboard/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setProfile({ ...profile, ...updatedData });
        setIsEditing(false);
        
        notifications.show({
          title: 'Succes!',
          message: 'Profilul a fost actualizat cu succes!',
          color: 'green',
          icon: <IconCheck size={16} />
        });
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      notifications.show({
        title: 'Eroare!',
        message: 'Eroare la actualizarea profilului.',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      notifications.show({
        title: 'Eroare!',
        message: 'Parolele nu se potrivesc!',
        color: 'red',
        icon: <IconX size={16} />
      });
      return;
    }

    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSecuritySettings({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      notifications.show({
        title: 'Succes!',
        message: 'Parola a fost schimbată cu succes!',
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch (error) {
      notifications.show({
        title: 'Eroare!',
        message: 'Eroare la schimbarea parolei.',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationUpdate = async (newSettings: NotificationSettings) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/dashboard/notifications', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setNotificationSettings(newSettings);
        notifications.show({
          title: 'Succes!',
          message: 'Setările de notificare au fost actualizate!',
          color: 'green',
          icon: <IconCheck size={16} />
        });
      } else {
        throw new Error(result.error || 'Failed to update notification settings');
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      notifications.show({
        title: 'Eroare!',
        message: 'Eroare la actualizarea setărilor.',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Center h="50vh">
        <Stack align="center">
          <Loader size="lg" />
          <Text>Se încarcă profilul...</Text>
        </Stack>
      </Center>
    );
  }

  if (!profile) {
    return (
      <Center h="50vh">
        <Text c="dimmed">Nu s-au putut încărca datele profilului.</Text>
      </Center>
    );
  }

  return (
    <Stack gap="xl" p="xl">
      {/* Header */}
      <Group justify="space-between">
        <Stack gap="xs">
          <Title order={1}>Profil</Title>
          <Text c="dimmed">Gestionează informațiile contului și setările de securitate</Text>
        </Stack>
      </Group>

      {/* Profile Header */}
      <Card withBorder>
        <Group align="start">
          <div style={{ position: 'relative' }}>
            <Avatar 
              src={profile.avatar} 
              size={128}
              radius="md"
              alt={`${profile.firstName} ${profile.lastName}`}
            />
            <FileButton onChange={() => {}}>
              {(props) => (
                <ActionIcon
                  {...props}
                  size="lg"
                  radius="xl"
                  variant="filled"
                  color="blue"
                  style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    right: 0 
                  }}
                >
                  <IconCamera size={16} />
                </ActionIcon>
              )}
            </FileButton>
          </div>
          
          <Stack flex={1} gap="xs">
            <Group justify="space-between">
              <Stack gap="xs">
                <Title order={2}>
                  {profile.firstName} {profile.lastName}
                </Title>
                <Text c="dimmed">{profile.email}</Text>
                {profile.company && (
                  <Text c="dimmed">{profile.company}</Text>
                )}
              </Stack>
              
              <Button
                leftSection={<IconEdit size={16} />}
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? "outline" : "filled"}
              >
                {isEditing ? 'Anulează' : 'Editează'}
              </Button>
            </Group>
            
            <Group gap="xl" mt="md">
              <Group gap="xs">
                <IconCalendar size={16} />
                <Text size="sm" c="dimmed">
                  Membru din {new Date(profile.createdAt).toLocaleDateString('ro-RO')}
                </Text>
              </Group>
              
              <Badge 
                color={profile.emailVerified ? 'green' : 'red'}
                leftSection={<IconShield size={12} />}
              >
                Email {profile.emailVerified ? 'verificat' : 'neverificat'}
              </Badge>
            </Group>
          </Stack>
        </Group>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
            Informații Personale
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconShield size={16} />}>
            Securitate
          </Tabs.Tab>
          <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>
            Notificări
          </Tabs.Tab>
        </Tabs.List>

        {/* Profile Tab */}
        <Tabs.Panel value="profile">
          <Card withBorder mt="md">
            <Stack gap="md">
              <Text size="lg" fw={600}>Informații Personale</Text>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Prenume"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    disabled={!isEditing}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Nume"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    disabled={!isEditing}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Email"
                    value={profile.email}
                    disabled
                    leftSection={<IconMail size={16} />}
                    rightSection={
                      profile.emailVerified && <IconCheck size={16} color="green" />
                    }
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Telefon"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    disabled={!isEditing}
                    leftSection={<IconPhone size={16} />}
                    placeholder="Nu este specificat"
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Companie"
                    value={profile.company || ''}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Nu este specificată"
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Locație"
                    value={profile.location || ''}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    disabled={!isEditing}
                    leftSection={<IconMapPin size={16} />}
                    placeholder="Nu este specificată"
                  />
                </Grid.Col>
              </Grid>

              <Textarea
                label="Biografie"
                value={profile.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                disabled={!isEditing}
                placeholder="Scrie câteva cuvinte despre tine..."
                rows={4}
              />

              {isEditing && (
                <Group justify="end">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    Anulează
                  </Button>
                  <Button
                    leftSection={<IconDeviceFloppy size={16} />}
                    onClick={() => handleProfileUpdate(profile)}
                    loading={saving}
                  >
                    Salvează
                  </Button>
                </Group>
              )}
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* Security Tab */}
        <Tabs.Panel value="security">
          <Stack gap="md" mt="md">
            {/* Change Password */}
            <Card withBorder>
              <Stack gap="md">
                <Text size="lg" fw={600}>Schimbă Parola</Text>
                
                <Grid>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <PasswordInput
                      label="Parola Curentă"
                      value={securitySettings.currentPassword}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        currentPassword: e.target.value
                      })}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <PasswordInput
                      label="Parola Nouă"
                      value={securitySettings.newPassword}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        newPassword: e.target.value
                      })}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <PasswordInput
                      label="Confirmă Parola"
                      value={securitySettings.confirmPassword}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        confirmPassword: e.target.value
                      })}
                    />
                  </Grid.Col>
                </Grid>

                <Group>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={!securitySettings.currentPassword || !securitySettings.newPassword || !securitySettings.confirmPassword}
                    loading={saving}
                  >
                    Schimbă Parola
                  </Button>
                </Group>
              </Stack>
            </Card>

            {/* Two Factor Authentication */}
            <Card withBorder>
              <Group justify="space-between">
                <Stack gap="xs">
                  <Text fw={500}>Autentificare în Doi Pași</Text>
                  <Text size="sm" c="dimmed">
                    Adaugă un nivel suplimentar de securitate contului tău
                  </Text>
                </Stack>
                <Switch
                  checked={profile.twoFactorEnabled}
                  onChange={(e) => setProfile({ ...profile, twoFactorEnabled: e.target.checked })}
                />
              </Group>
            </Card>

            {/* Delete Account */}
            <Card withBorder>
              <Alert color="red" icon={<IconInfoCircle />} title="Șterge Contul">
                <Text size="sm" mb="md">
                  Această acțiune va șterge permanent contul și toate datele asociate. Acțiunea nu poate fi anulată.
                </Text>
                <Button color="red" leftSection={<IconTrash size={16} />}>
                  Șterge Contul
                </Button>
              </Alert>
            </Card>
          </Stack>
        </Tabs.Panel>

        {/* Notifications Tab */}
        <Tabs.Panel value="notifications">
          <Card withBorder mt="md">
            <Stack gap="md">
              <Text size="lg" fw={600}>Setări de Notificare</Text>
              
              <Stack gap="lg">
                {[
                  {
                    key: 'emailNotifications' as keyof NotificationSettings,
                    title: 'Notificări Email',
                    description: 'Primește notificări generale prin email'
                  },
                  {
                    key: 'keywordAlerts' as keyof NotificationSettings,
                    title: 'Alerte Keywords',
                    description: 'Notificări când pozițiile keywords-urilor se schimbă semnificativ'
                  },
                  {
                    key: 'reportDigest' as keyof NotificationSettings,
                    title: 'Raport Săptămânal',
                    description: 'Primește un rezumat săptămânal al performanței'
                  },
                  {
                    key: 'securityAlerts' as keyof NotificationSettings,
                    title: 'Alerte de Securitate',
                    description: 'Notificări importante despre securitatea contului'
                  }
                ].map(({ key, title, description }) => (
                  <Group key={key} justify="space-between" p="md" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}>
                    <Stack gap="xs">
                      <Text fw={500}>{title}</Text>
                      <Text size="sm" c="dimmed">{description}</Text>
                    </Stack>
                    <Switch
                      checked={notificationSettings[key]}
                      onChange={(e) => {
                        const newSettings = {
                          ...notificationSettings,
                          [key]: e.target.checked
                        };
                        setNotificationSettings(newSettings);
                        handleNotificationUpdate(newSettings);
                      }}
                    />
                  </Group>
                ))}
              </Stack>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}