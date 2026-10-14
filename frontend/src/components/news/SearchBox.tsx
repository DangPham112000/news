import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { setQuery } from '@/store/uiSlice';
import { useAppDispatch } from '@/store';

export function SearchBox() {
  const [text, setText] = useState('');
  const dispatch = useAppDispatch();

  // Wait for a pause in typing before querying.
  useEffect(() => {
    const id = setTimeout(() => dispatch(setQuery(text.trim())), 300);
    return () => clearTimeout(id);
  }, [text, dispatch]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tìm trong tin…"
        aria-label="Tìm trong tin"
        className="pl-8"
      />
    </div>
  );
}
