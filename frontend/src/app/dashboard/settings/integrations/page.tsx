'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Card, Group, Stack, Text, Title, Alert, Loader, Select, Table, Badge, Center } from '@mantine/core';
import { IconBrandGoogle, IconCheck, IconLink, IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { googleAnalyticsApi, websitesApi } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { Website } from '@/types';

interface GAProperty {
    propertyId: string;
    propertyName: string;
    accountName: string;
}

interface Mapping {
    [websiteId: string]: string | null;
}

export default function IntegrationsPage() {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [gaProperties, setGaProperties] = useState<GAProperty[]>([]);
    const [mappings, setMappings] = useState<Mapping>({});
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [websitesRes, statusRes] = await Promise.all([
                websitesApi.getAll(),
                googleAnalyticsApi.getStatus() // Status la nivel de user, websiteId e ignorat
            ]);

            setWebsites(websitesRes.websites || []);
            setIsConnected(statusRes.connected);

            const initialMappings: Mapping = {};
            websitesRes.websites.forEach(w => {
                const foundMapping = statusRes.mappings.find((m: any) => m.websiteId === w.id);
                initialMappings[w.id] = foundMapping ? foundMapping.gaPropertyId : null;
            });
            setMappings(initialMappings);

            if (statusRes.connected) {
                const propsRes = await googleAnalyticsApi.getProperties(); // 0 = pt user
                setGaProperties(propsRes.properties || []);
                autoMatchProperties(websitesRes.websites, propsRes.properties, initialMappings);
            }
        } catch (error) {
            console.error("Failed to fetch integration data:", error);
            notifications.show({ title: 'Eroare', message: 'Nu s-au putut încărca datele de integrare.', color: 'red' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const autoMatchProperties = (localWebsites: Website[], remoteProperties: GAProperty[], currentMappings: Mapping) => {
        const newMappings = { ...currentMappings };
        let matched = false;
        localWebsites.forEach(website => {
            if (!newMappings[website.id]) { // Doar dacă nu are deja o mapare
                const cleanLocalDomain = website.domain.replace(/^www\./, '');
                const foundProp = remoteProperties.find(prop => prop.propertyName.toLowerCase().includes(cleanLocalDomain.toLowerCase()));
                if (foundProp) {
                    newMappings[website.id] = foundProp.propertyId;
                    matched = true;
                }
            }
        });
        if (matched) {
            setMappings(newMappings);
            notifications.show({ title: 'Potrivire Automată', message: 'Am găsit potriviri între site-urile tale și proprietățile Google Analytics.', color: 'blue' });
        }
    };

    const handleConnect = async () => {
        setLoading(true);
        try {
            const res = await googleAnalyticsApi.connect(); // 0 = pt user
            window.location.href = res.authUrl;
        } catch (error) {
            notifications.show({ title: 'Eroare', message: 'Nu s-a putut iniția conexiunea.', color: 'red' });
            setLoading(false);
        }
    };

    const handleSaveMappings = async () => {
        setSaving(true);
        try {
            const validMatches = Object.entries(mappings).reduce((acc, [key, value]) => {
                if (value) acc[key] = value;
                return acc;
            }, {} as { [key: string]: string });

            await googleAnalyticsApi.matchProperties({ matches: validMatches });
            notifications.show({ title: 'Succes!', message: 'Mapările au fost salvate.', color: 'green' });
        } catch (error) {
            notifications.show({ title: 'Eroare', message: 'Mapările nu au putut fi salvate.', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Center h="50vh"><Loader /></Center>;

    const propertyOptions = gaProperties.map(p => ({ value: p.propertyId, label: `${p.propertyName} (${p.accountName})` }));

    return (
        <Stack gap="xl">
            <Title order={2}>Integrări</Title>
            <Card withBorder>
                <Group justify="space-between">
                    <Stack gap="xs">
                        <Title order={4}>Google Analytics</Title>
                        <Text c="dimmed">Conectează-ți contul pentru a oferi AI-ului date reale despre performanța site-ului tău.</Text>
                    </Stack>
                    <Button leftSection={<IconBrandGoogle />} onClick={handleConnect} loading={loading} disabled={isConnected}>
                        {isConnected ? 'Conectat' : 'Conectează-te cu Google'}
                    </Button>
                </Group>

                {isConnected && (
                    <Stack mt="xl">
                        <Alert icon={<IconCheck />} color="green" title="Cont Conectat cu Succes!">
                            Acum poți mapa proprietățile tale Google Analytics la website-urile din platformă.
                        </Alert>
                        <Table.ScrollContainer minWidth={600}>
                            <Table verticalSpacing="md">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Website Local</Table.Th>
                                        <Table.Th>Proprietate Google Analytics</Table.Th>
                                        <Table.Th>Status</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {websites.map(website => (
                                        <Table.Tr key={website.id}>
                                            <Table.Td>
                                                <Text fw={500}>{website.name}</Text>
                                                <Text size="xs" c="dimmed">{website.domain}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Select
                                                    placeholder="Alege o proprietate"
                                                    data={propertyOptions}
                                                    value={mappings[website.id]}
                                                    onChange={(value) => setMappings(prev => ({ ...prev, [website.id]: value }))}
                                                    searchable
                                                    clearable
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                {mappings[website.id] ?
                                                    <Badge color="teal" variant="light" leftSection={<IconLink size={12} />}>Mapat</Badge> :
                                                    <Badge color="gray">Nemapata</Badge>
                                                }
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                        <Group justify="flex-end">
                            <Button onClick={handleSaveMappings} loading={saving}>Salvează Mapările</Button>
                        </Group>
                    </Stack>
                )}
            </Card>
        </Stack>
    );
}