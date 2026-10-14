import { useQuery } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { GET_ARTICLES, GET_TOPICS } from '@/graphql/queries';
import type { ArticlesData, TopicsData } from '@/graphql/types';
import { useAppSelector } from '@/store';
import { ArticleCard } from './ArticleCard';

const PAGE_SIZE = 20;

export function ArticleList() {
  const topic = useAppSelector((s) => s.ui.topic);
  const q = useAppSelector((s) => s.ui.query);
  const { data: topicData } = useQuery<TopicsData>(GET_TOPICS);
  const { data, loading, error, fetchMore } = useQuery<ArticlesData>(GET_ARTICLES, {
    variables: { topic, q: q || null, page: 1, pageSize: PAGE_SIZE },
    notifyOnNetworkStatusChange: true,
  });

  const names = new Map(topicData?.topics.map((t) => [t.slug, t.name]));
  const articles = data?.articles;
  const items = articles?.items ?? [];

  if (error && !articles) {
    return <p className="py-10 text-center text-sm text-destructive">Không tải được tin: {error.message}</p>;
  }
  if (!articles) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Đang tải…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {q || topic ? 'Không có tin nào khớp.' : 'Chưa có tin nào. Nhờ AI agent cập nhật tin qua MCP để bắt đầu.'}
      </p>
    );
  }

  const nextPage = Math.floor(items.length / PAGE_SIZE) + 1;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{articles.total} tin</p>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id}>
            <ArticleCard article={a} topicName={topic ? undefined : names.get(a.topic)} />
          </li>
        ))}
      </ul>
      {items.length < articles.total && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() =>
              fetchMore({ variables: { topic, q: q || null, page: nextPage, pageSize: PAGE_SIZE } })
            }
          >
            {loading ? 'Đang tải…' : 'Xem thêm'}
          </Button>
        </div>
      )}
    </div>
  );
}
