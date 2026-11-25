-- Tuned on ~14 live questions: in-guide answers retrieved at 0.63–0.77, off-topic at 0.58.
-- Gemini's answer_found does the real gating; 0.5 only catches nonsense queries.
update public.settings set data = jsonb_set(data, '{evidenceThreshold}', '0.5') where id = 1;
