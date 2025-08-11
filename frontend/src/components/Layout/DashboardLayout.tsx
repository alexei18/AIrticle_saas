  'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  AppShell,
  Burger,
  Header,
  Text,
  Group,
  Avatar,
  Menu,
  Button,
  Stack,
  Badge,
  UnstyledButton,
  Loader,
  Center,
  ScrollArea,
  rem
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard,
  IconWorld,
  IconSearch,
  IconEdit,
  IconChartLine,
  IconSettings,
  IconLogout,
  IconUser,
  IconChevronRight,
  IconPlus,
  IconPlug // Iconiță nouă pentru integrări
} from '@tabler/icons-react';
import { useAuthStore } from '@/store/authStore';
import { notifications } from '@mantine/notifications';

interface NavLinkProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: string;
  active?: boolean;
  onClick: () => void;
}

function NavLink({ icon, label, href, badge, active, onClick }: NavLinkProps) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={(theme) => ({
        display: 'block',
        width: '100%',
        padding: theme.spacing.sm,
        borderRadius: theme.radius.sm,
        color: active ? theme.colors.brand[6] : theme.colors.gray[7],
        backgroundColor: active ? theme.colors.brand[0] : 'transparent',
        '&:hover': {
          backgroundColor: active ? theme.colors.brand[1] : theme.colors.gray[0],
        },
      })}
    >
      <Group justify="space-between">
        <Group gap="sm">
          {icon}
          <Text size="sm" fw={active ? 600 : 400}>
            {label}
          </Text>
        </Group>
        {badge && (
          <Badge size="xs" variant="filled">
            {badge}
          </Badge>
        )}
      </Group>
    </UnstyledButton>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = () => {
    logout();
    notifications.show({
      title: 'Deconectat cu succes',
      message: 'La revedere!',
      color: 'blue',
    });
    router.push('/');
  };

  // --- AICI ESTE MODIFICAREA ---
  const navItems = [
    {
      icon: <IconDashboard size={18} />,
      label: 'Dashboard',
      href: '/dashboard',
    },
    {
      icon: <IconWorld size={18} />,
      label: 'Website-uri',
      href: '/dashboard/websites',
    },
    {
      icon: <IconSearch size={18} />,
      label: 'Keywords',
      href: '/dashboard/keywords',
    },
    {
      icon: <IconEdit size={18} />,
      label: 'Articole',
      href: '/dashboard/articles',
    },
    {
      icon: <IconChartLine size={18} />,
      label: 'Analize',
      href: '/dashboard/analytics',
    },
    // --- NOUL ELEMENT PENTRU INTEGRĂRI ---
    {
      icon: <IconPlug size={18} />,
      label: 'Integrări',
      href: '/dashboard/settings/integrations',
      badge: 'Nou'
    }
  ];

  if (isLoading) {
    return <Center h="100vh"><Loader size="lg" /></Center>;
  }

  if (!isAuthenticated || !user) {
    return null; // Sau un alt loader
  }

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 280,
        breakpoint: 'md',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
            <Text size="xl" fw={700} c="brand">
              AIrticle SaaS
            </Text>
          </Group>

          <Group>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => router.push('/dashboard/websites/new')}
              size="sm"
            >
              Adaugă Website
            </Button>

            <Menu shadow="md" width={250}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="sm">
                    <Avatar size="sm" color="brand">
                      {user.firstName[0]}{user.lastName[0]}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        {user.firstName} {user.lastName}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Plan {user.planType}
                      </Text>
                    </div>
                    <IconChevronRight size={16} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Cont</Menu.Label>
                <Menu.Item
                  leftSection={<IconUser size={14} />}
                  onClick={() => router.push('/dashboard/profile')}
                >
                  Profil
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconSettings size={14} />}
                  onClick={() => router.push('/dashboard/settings')}
                >
                  Setări
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout size={14} />}
                  onClick={handleLogout}
                  color="red"
                >
                  Deconectare
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap="xs">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname === item.href}
                onClick={() => {
                  router.push(item.href);
                  if (opened) toggle();
                }}
              />
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" fw={600}>
                PLAN CURENT
              </Text>
              <Badge size="sm" variant="light" color="brand">
                {user.planType.toUpperCase()}
              </Badge>
            </Group>

            {user.trialEndsAt && new Date(user.trialEndsAt) > new Date() && (
              <Text size="xs" c="orange">
                Probă gratuită până la{' '}
                {new Date(user.trialEndsAt).toLocaleDateString('ro-RO')}
              </Text>
            )}

            <Button
              variant="light"
              size="xs"
              fullWidth
              onClick={() => router.push('/dashboard/upgrade')}
            >
              Upgrade Plan
            </Button>
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
