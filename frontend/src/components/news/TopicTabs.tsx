import { useQuery } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { GET_TOPICS } from '@/graphql/queries';
import type { TopicsData } from '@/graphql/types';
import { setTopic } from '@/store/uiSlice';
import { useAppDispatch, useAppSelector } from '@/store';

export function TopicTabs() {
  const { data } = useQuery<TopicsData>(GET_TOPICS);
  const selected = useAppSelector((s) => s.ui.topic);
  const dispatch = useAppDispatch();
  const topics = data?.topics ?? [];
  const total = topics.reduce((n, t) => n + t.articleCount, 0);

  const tab = (slug: string | null, label: string, count: number) => (
    <Button
      key={slug ?? 'all'}
      size="sm"
      variant={selected === slug ? 'default' : 'outline'}
      aria-pressed={selected === slug}
      onClick={() => dispatch(setTopic(slug))}
    >
      {label}
      <span className="opacity-70">{count}</span>
    </Button>
  );

  return (
    <nav aria-label="Chủ đề" className="flex flex-wrap gap-2">
      {tab(null, 'Tất cả', total)}
      {topics.map((t) => tab(t.slug, t.name, t.articleCount))}
    </nav>
  );
}
