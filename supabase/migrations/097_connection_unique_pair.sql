ALTER TABLE public.connection
  ADD CONSTRAINT connection_unique_pair UNIQUE (exhibitor_user_id, buyer_user_id);
