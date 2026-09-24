-- Historial de periodos de archivado ya cerrados. `habits.archived_at` solo
-- guarda el archivado vigente; al restaurar se ponía a null y se perdía cuándo
-- estuvo archivado el hábito, de modo que esos días volvían a contar como
-- incumplidos y rompían rachas y porcentajes. Cada restauración deja aquí la
-- ventana [archived_at, restored_at) en la que el hábito no contaba.

create table public.habit_archive_periods (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  archived_at timestamptz not null,
  restored_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint habit_archive_periods_habit_owner_fkey
    foreign key (habit_id, user_id)
    references public.habits (id, user_id)
    on delete cascade,
  constraint habit_archive_periods_order_check check (restored_at >= archived_at)
);

create index habit_archive_periods_user_habit_idx
  on public.habit_archive_periods (user_id, habit_id, archived_at);
create index habit_archive_periods_habit_owner_idx
  on public.habit_archive_periods (habit_id, user_id);

-- Lo escribe solo este trigger, en la misma transacción que la restauración:
-- los clientes no tienen permiso de escritura sobre la tabla, así que no
-- pueden inventar periodos para ocultar días incumplidos. `restored_at` usa la
-- hora del servidor.
create function private.record_habit_archive_period()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.archived_at is not null and new.archived_at is null then
    insert into public.habit_archive_periods (habit_id, user_id, archived_at, restored_at)
    values (old.id, old.user_id, old.archived_at, greatest(now(), old.archived_at));
  end if;
  return new;
end;
$$;

revoke all on function private.record_habit_archive_period() from public, anon, authenticated;

create trigger habits_record_archive_period
after update of archived_at on public.habits
for each row execute function private.record_habit_archive_period();

alter table public.habit_archive_periods enable row level security;

revoke all on table public.habit_archive_periods from anon, authenticated;
grant select on table public.habit_archive_periods to authenticated;

create policy "habit_archive_periods_select_own"
on public.habit_archive_periods for select
to authenticated
using ((select auth.uid()) = user_id);
