import { AccountButton } from '@/components/auth/AccountButton';
import { ArticleList } from '@/components/news/ArticleList';
import { SearchBox } from '@/components/news/SearchBox';
import { TopicTabs } from '@/components/news/TopicTabs';
import { authEnabled } from '@/lib/auth';
import { usePathname } from '@/lib/navigation';
import { SignInPage } from '@/pages/SignInPage';

function App() {
  const pathname = usePathname();
  if (authEnabled && /^\/sign-in(\/|$)/.test(pathname)) return <SignInPage mode="sign-in" />;
  if (authEnabled && /^\/sign-up(\/|$)/.test(pathname)) return <SignInPage mode="sign-up" />;

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-16 pt-6">
      <header className="mb-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">News</h1>
          <AccountButton />
        </div>
        <SearchBox />
        <TopicTabs />
      </header>
      <main>
        <ArticleList />
      </main>
    </div>
  );
}

export default App;
