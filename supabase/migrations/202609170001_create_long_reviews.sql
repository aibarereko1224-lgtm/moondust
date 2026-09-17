create table if not exists public.long_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id bigint not null references public.entries(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, entry_id)
);

alter table public.long_reviews enable row level security;

revoke all on public.long_reviews from anon;
grant select, insert, update, delete on public.long_reviews to authenticated;

drop policy if exists "Users can read their own long reviews" on public.long_reviews;
create policy "Users can read their own long reviews"
  on public.long_reviews for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own long reviews" on public.long_reviews;
create policy "Users can create their own long reviews"
  on public.long_reviews for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.entries
      where entries.id = entry_id and entries.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own long reviews" on public.long_reviews;
create policy "Users can update their own long reviews"
  on public.long_reviews for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.entries
      where entries.id = entry_id and entries.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own long reviews" on public.long_reviews;
create policy "Users can delete their own long reviews"
  on public.long_reviews for delete
  using (auth.uid() = user_id);

create or replace function public.set_long_review_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_long_reviews_updated_at on public.long_reviews;
create trigger set_long_reviews_updated_at
before update on public.long_reviews
for each row execute function public.set_long_review_updated_at();
