-- now() is the transaction start, so a question and its reply inserted together tied and could swap.
-- clock_timestamp() advances per row, keeping insert order.
alter table public.messages alter column created_at set default clock_timestamp();
