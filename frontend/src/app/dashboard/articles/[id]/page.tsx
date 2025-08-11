'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box,
    Title,
    Text,
    Paper,
    Stack,
    Group,
    Badge,
    Button,
    Loader,
    Center,
    Alert,
    Divider,
    SimpleGrid,
    Card,
    ActionIcon,
    Tooltip,
    ThemeIcon
} from '@mantine/core';
import {
    IconArrowLeft,
    IconCalendar,
    IconFileText,
    IconWorld,
    IconEdit,
    IconTrash,
    IconAlertCircle
} from '@tabler/icons-react';
import { articlesApi } from '@/lib/api';
import { Article } from '@/types';
import { notifications } from '@mantine/notifications';

export default function ArticleDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const articleId = params?.id as string;

    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArticle = async () => {
            if (!articleId) return;
            setLoading(true);
            try {
                const response = await articlesApi.getById(parseInt(articleId));
                setArticle(response.article);
            } catch (error: any) {
                notifications.show({
                    title: 'Eroare la încărcarea articolului',
                    message: error.response?.data?.error || 'Nu am putut încărca detaliile.',
                    color: 'red'
                });
                router.push('/dashboard/articles');
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
    }, [articleId, router]);

    const handleDelete = async () => {
        if (!article) return;
        try {
            await articlesApi.delete(article.id);
            notifications.show({
                title: 'Succes!',
                message: 'Articolul a fost șters.',
                color: 'green'
            });
            router.push('/dashboard/articles');
        } catch (error: any) {
            notifications.show({
                title: 'Eroare',
                message: 'Articolul nu a putut fi șters.',
                color: 'red'
            });
        }
    }

    if (loading) {
        return <Center h="80vh"><Loader /></Center>;
    }

    if (!article) {
        return (
            <Center h="80vh">
                <Alert icon={<IconAlertCircle size={16} />} title="Articol negăsit" color="red">
                    Articolul pe care îl cauți nu există sau nu ai permisiunea de a-l vizualiza.
                </Alert>
            </Center>
        );
    }

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Button
                    variant="subtle"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => router.push('/dashboard/articles')}
                >
                    Înapoi la Articole
                </Button>
                <Group>
                    <Button variant='outline' leftSection={<IconEdit size={16} />} onClick={() => router.push(`/dashboard/articles/${article.id}/edit`)}>Editează</Button>
                    <Tooltip label="Șterge Articolul" withArrow>
                        <ActionIcon variant='filled' color='red' size="lg" onClick={handleDelete}>
                            <IconTrash size={18} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            <Paper withBorder radius="md" p="xl">
                <Stack gap="md">
                    <Badge
                        variant="light"
                        color={article.status === 'published' ? 'green' : 'orange'}
                        size="lg"
                    >
                        {article.status.charAt(0).toUpperCase() + article.status.slice(1)}
                    </Badge>

                    <Title order={1}>{article.title}</Title>

                    <Group gap="xl">
                        <Group gap="xs" align="center">
                            <ThemeIcon variant="light" size="sm" color="gray"><IconWorld size={14} /></ThemeIcon>
                            <Text size="sm" c="dimmed">{article.website?.name}</Text>
                        </Group>
                        <Group gap="xs" align="center">
                            <ThemeIcon variant="light" size="sm" color="gray"><IconCalendar size={14} /></ThemeIcon>
                            <Text size="sm" c="dimmed">Creat la: {new Date(article.createdAt).toLocaleDateString('ro-RO')}</Text>
                        </Group>
                        <Group gap="xs" align="center">
                            <ThemeIcon variant="light" size="sm" color="gray"><IconFileText size={14} /></ThemeIcon>
                            <Text size="sm" c="dimmed">{article.wordCount} cuvinte</Text>
                        </Group>
                    </Group>

                    {article.targetKeywords && article.targetKeywords.length > 0 && (
                        <Group gap="xs" mt="xs">
                            <Text size="sm" fw={500}>Keywords:</Text>
                            {article.targetKeywords.map(kw => <Badge key={kw} variant="outline">{kw}</Badge>)}
                        </Group>
                    )}

                    <Divider my="md" />

                    <Title order={4} mb="sm">Conținut Articol</Title>
                    <Box
                        dangerouslySetInnerHTML={{ __html: article.content }}
                        style={{ lineHeight: 1.7, fontSize: '1.1rem' }}
                        className="article-content"
                    />
                </Stack>
            </Paper>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                <Card withBorder radius="md">
                    <Title order={4}>Meta Title</Title>
                    <Text c="dimmed" mt="xs" fz="sm">{article.metaTitle || 'Nu a fost generat'}</Text>
                </Card>
                <Card withBorder radius="md">
                    <Title order={4}>Meta Description</Title>
                    <Text c="dimmed" mt="xs" fz="sm">{article.metaDescription || 'Nu a fost generată'}</Text>
                </Card>
            </SimpleGrid>

        </Stack>
    );
}

declare module 'react' {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        dangerouslySetInnerHTML?: {
            __html: string;
        };
    }
}