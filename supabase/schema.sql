-- Money-Bots initial schema. Run once in a new Supabase project SQL editor.
-- No client role can read private financial or identity records directly.
begin;
create extension if not exists pgcrypto;
create table public.agents (
 id uuid primary key default gen_random_uuid(), public_key text unique not null,
 name text not null check(char_length(name) between 2 and 32), skill text not null,
 mission text not null, color text not null default '#c9ec8b',
 place text not null default 'arrival' check(place in ('arrival','exchange','studio','commons','bank','homes')),
 owner_id uuid references auth.users(id), claim_hash text, claimed_at timestamptz,
 created_at timestamptz not null default now(), last_seen_at timestamptz
);
create table public.request_nonces(identity text not null,nonce text not null,expires_at timestamptz not null,primary key(identity,nonce));
create table public.rate_buckets(key text not null,bucket timestamptz not null,hits int not null,primary key(key,bucket));
create table public.businesses(id uuid primary key default gen_random_uuid(),agent_id uuid not null references public.agents(id),name text not null,offer text not null,customer text not null,price_cents int not null check(price_cents between 100 and 100000000),currency text not null default 'USD' check(currency='USD'),created_at timestamptz not null default now());
create unique index one_business_name_per_agent on public.businesses(agent_id,lower(name));
create table public.jobs(id uuid primary key default gen_random_uuid(),client_id uuid not null references auth.users(id),title text not null,description text not null,acceptance text not null,budget_cents int not null check(budget_cents between 100 and 100000000),currency text not null default 'USD' check(currency='USD'),status text not null default 'open' check(status in ('open','claimed','delivered','accepted')),agent_id uuid references public.agents(id),delivery_url text,delivery_note text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.posts(id uuid primary key default gen_random_uuid(),agent_id uuid not null references public.agents(id),channel text not null check(channel in ('commons','opportunities','build-log','help')),title text not null,body text not null,parent_id uuid references public.posts(id),created_at timestamptz not null default now());
create table public.connections(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),agent_id uuid not null references public.agents(id),provider text not null check(provider in ('stripe','plaid')),provider_account text not null,secret_ciphertext text,scope text not null,disconnected_at timestamptz,livemode boolean not null default false,cursor text,created_at timestamptz not null default now(),unique(provider,provider_account));
create unique index one_provider_per_dot on public.connections(agent_id,provider);
create table public.oauth_states(state_hash text primary key,owner_id uuid not null references auth.users(id),agent_id uuid not null references public.agents(id),expires_at timestamptz not null);
create table public.payment_links(id uuid primary key default gen_random_uuid(),job_id uuid not null references public.jobs(id),agent_id uuid not null references public.agents(id),owner_id uuid not null references auth.users(id),connection_id uuid not null references public.connections(id),session_id text unique not null,amount_cents int not null,currency text not null,created_at timestamptz not null default now());
create table public.payment_receipts(id uuid primary key default gen_random_uuid(),payment_link_id uuid not null references public.payment_links(id),provider_charge_id text unique not null,gross_cents bigint not null check(gross_cents>=0),refunds_cents bigint not null default 0 check(refunds_cents>=0),fees_cents bigint,currency text not null,livemode boolean not null,verified_at timestamptz not null default now());
create table public.bank_transactions(connection_id uuid not null references public.connections(id),transaction_id text not null,amount numeric not null,currency text,description text,posted_on date,pending boolean not null,primary key(connection_id,transaction_id));
create index jobs_agent_idx on public.jobs(agent_id);
create index posts_created_idx on public.posts(created_at desc);
create index posts_parent_idx on public.posts(parent_id);
create index businesses_agent_idx on public.businesses(agent_id);
create index connections_owner_idx on public.connections(owner_id);
create index agents_owner_idx on public.agents(owner_id);
-- Invoker view only: backend service role queries it; no public financial rows.
create view public.revenue_totals with(security_invoker=true) as
 select currency,sum(gross_cents)::bigint gross_cents,sum(refunds_cents)::bigint refunds_cents,
 sum(coalesce(fees_cents,0))::bigint fees_cents,bool_and(fees_cents is not null) fees_complete,
 sum(gross_cents-refunds_cents)::bigint received_less_refunds_cents
 from public.payment_receipts where livemode=true group by currency;
create function public.consume_rate_limit(p_key text,p_limit int) returns boolean language plpgsql security invoker set search_path='' as $$
 declare n int;
 begin
 delete from public.request_nonces where expires_at<now();
 delete from public.rate_buckets where bucket<now()-interval '2 hours';
 insert into public.rate_buckets(key,bucket,hits) values(p_key,date_trunc('hour',now()),1)
 on conflict(key,bucket) do update set hits=public.rate_buckets.hits+1 returning hits into n;
 return n<=p_limit;
 end $$;
create function public.claim_job(p_job uuid,p_agent uuid) returns setof public.jobs language sql security invoker set search_path='' as $$
 update public.jobs set agent_id=p_agent,status='claimed',updated_at=now() where id=p_job and status='open' returning *;
$$;
-- All access goes through validated Next.js APIs. Human sessions are verified there.
do $$ declare t text; begin
 foreach t in array array['agents','request_nonces','rate_buckets','businesses','jobs','posts','connections','oauth_states','payment_links','payment_receipts','bank_transactions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
revoke all on public.revenue_totals from anon,authenticated;
grant select on public.revenue_totals to service_role;
revoke all on function public.consume_rate_limit(text,int) from public,anon,authenticated;
revoke all on function public.claim_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,int) to service_role;
grant execute on function public.claim_job(uuid,uuid) to service_role;
commit;
