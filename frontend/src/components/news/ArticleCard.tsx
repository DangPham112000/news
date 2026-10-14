import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { hostname, timeAgo } from '@/lib/format';
import type { Article } from '@/graphql/types';

export function ArticleCard({ article, topicName }: { article: Article; topicName?: string }) {
  const when = article.publishedAt ?? article.fetchedAt;
  return (
    <article className="rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:border-primary/50">
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {topicName && <Badge variant="secondary">{topicName}</Badge>}
        <span>{article.source || hostname(article.url)}</span>
        <span aria-hidden>·</span>
        <time dateTime={when} title={new Date(when).toLocaleString('vi-VN')}>
          {timeAgo(when)}
        </time>
      </div>
      <h2 className="text-base font-semibold leading-snug">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1.5 hover:text-primary"
        >
          <span>{article.title}</span>
          <ExternalLink className="mt-1 size-3.5 shrink-0 opacity-60" aria-hidden />
        </a>
      </h2>
      {article.summary && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{article.summary}</p>}
    </article>
  );
}
