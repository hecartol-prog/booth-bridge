begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon, service_role;

create or replace function private.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(lower((auth.jwt() -> 'app_metadata' ->> 'role')), '') = 'admin';
$$;

create or replace function private.is_company_owner(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company c
    where c.id = target_company_id
      and c.created_by_user_id = auth.uid()
  );
$$;

create or replace function private.is_exhibitor_profile_owner(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exhibitor_profile ep
    where ep.id = target_profile_id
      and ep.user_id = auth.uid()
  );
$$;

create or replace function private.is_buyer_profile_owner(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.buyer_profile bp
    where bp.id = target_profile_id
      and bp.user_id = auth.uid()
  );
$$;

create or replace function private.is_connection_participant(target_connection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.connection c
    where c.id = target_connection_id
      and auth.uid() in (c.exhibitor_user_id, c.buyer_user_id)
  );
$$;

create or replace function private.is_lead_profile_member(target_lead_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lead_profile lp
    where lp.id = target_lead_profile_id
      and (
        private.is_company_owner(lp.company_id)
        or lp.representative_user_id = auth.uid()
        or lp.buyer_user_id = auth.uid()
      )
  );
$$;

create or replace function private.is_sourcing_project_member(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sourcing_project sp
    where sp.id = target_project_id
      and sp.buyer_id = auth.uid()
  );
$$;

create or replace function private.is_integration_connection_owner(target_connection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.integration_connection ic
    where ic.id = target_connection_id
      and ic.user_id = auth.uid()
  );
$$;

create or replace function private.is_product_owner(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.product p
    where p.id = target_product_id
      and (
        p.exhibitor_user_id = auth.uid()
        or private.is_exhibitor_profile_owner(p.exhibitor_profile_id)
      )
  );
$$;

create or replace function private.is_billing_subscription_owner(target_subscription_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.billing_subscription bs
    where bs.id = target_subscription_id
      and bs.user_id = auth.uid()
  );
$$;

create or replace function private.is_asset_folder_owner(folder_identifier text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folder_uuid uuid;
begin
  if folder_identifier is null
     or folder_identifier !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  folder_uuid := folder_identifier::uuid;

  return private.is_company_owner(folder_uuid)
    or exists (
      select 1
      from public.exhibitor_profile ep
      where ep.id = folder_uuid
        and ep.user_id = auth.uid()
    );
end;
$$;

alter table public."user" enable row level security;
alter table public.event enable row level security;
alter table public.company enable row level security;
alter table public.exhibitor_profile enable row level security;
alter table public.buyer_profile enable row level security;
alter table public.verification_profile enable row level security;
alter table public.booth enable row level security;
alter table public.product enable row level security;
alter table public.catalog_item enable row level security;
alter table public.connection enable row level security;
alter table public.rfi enable row level security;
alter table public.meeting enable row level security;
alter table public.meeting_request enable row level security;
alter table public.media enable row level security;
alter table public.saved_booth enable row level security;
alter table public.saved_product enable row level security;
alter table public.lead_profile enable row level security;
alter table public.lead_intelligence enable row level security;
alter table public.lead_interaction enable row level security;
alter table public.activity enable row level security;
alter table public.notification enable row level security;
alter table public.sourcing_project enable row level security;
alter table public.project_supplier_mapping enable row level security;
alter table public.match_recommendation enable row level security;
alter table public.opportunity_post enable row level security;
alter table public.integration_connection enable row level security;
alter table public.integration_sync_log enable row level security;
alter table public.nfc_profile enable row level security;
alter table public.nfc_interaction enable row level security;
alter table public.nfc_product_tag enable row level security;
alter table public.scanned_contact enable row level security;
alter table public.billing_subscription enable row level security;
alter table public.billing_transaction enable row level security;
alter table public.premium_booth_subscription enable row level security;
alter table public.sponsored_listing enable row level security;
alter table public.support_ticket enable row level security;
alter table public.admin_access_log enable row level security;
alter table public.system_alert enable row level security;
alter table public.stress_test_result enable row level security;

drop policy if exists "user_admin_all" on public."user";
create policy "user_admin_all"
  on public."user"
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "user_self_all" on public."user";
create policy "user_self_all"
  on public."user"
  for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "event_admin_all" on public.event;
create policy "event_admin_all"
  on public.event
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "event_authenticated_read" on public.event;
create policy "event_authenticated_read"
  on public.event
  for select
  to authenticated
  using (true);

drop policy if exists "company_admin_all" on public.company;
create policy "company_admin_all"
  on public.company
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "company_owner_all" on public.company;
create policy "company_owner_all"
  on public.company
  for all
  to authenticated
  using (created_by_user_id = auth.uid())
  with check (created_by_user_id = auth.uid());

drop policy if exists "exhibitor_profile_admin_all" on public.exhibitor_profile;
create policy "exhibitor_profile_admin_all"
  on public.exhibitor_profile
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "exhibitor_profile_authenticated_read" on public.exhibitor_profile;
create policy "exhibitor_profile_authenticated_read"
  on public.exhibitor_profile
  for select
  to authenticated
  using (true);

drop policy if exists "exhibitor_profile_owner_all" on public.exhibitor_profile;
create policy "exhibitor_profile_owner_all"
  on public.exhibitor_profile
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "buyer_profile_admin_all" on public.buyer_profile;
create policy "buyer_profile_admin_all"
  on public.buyer_profile
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "buyer_profile_owner_all" on public.buyer_profile;
create policy "buyer_profile_owner_all"
  on public.buyer_profile
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "verification_profile_admin_all" on public.verification_profile;
create policy "verification_profile_admin_all"
  on public.verification_profile
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "verification_profile_company_owner_all" on public.verification_profile;
create policy "verification_profile_company_owner_all"
  on public.verification_profile
  for all
  to authenticated
  using (private.is_company_owner(company_id))
  with check (private.is_company_owner(company_id));

drop policy if exists "booth_admin_all" on public.booth;
create policy "booth_admin_all"
  on public.booth
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "booth_company_access_all" on public.booth;
create policy "booth_company_access_all"
  on public.booth
  for all
  to authenticated
  using (
    private.is_company_owner(company_id)
    or exhibitor_user_id = auth.uid()
    or primary_representative_id = auth.uid()
    or secondary_representative_id = auth.uid()
  )
  with check (
    private.is_company_owner(company_id)
    or exhibitor_user_id = auth.uid()
    or primary_representative_id = auth.uid()
    or secondary_representative_id = auth.uid()
  );

drop policy if exists "product_admin_all" on public.product;
create policy "product_admin_all"
  on public.product
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "product_authenticated_read" on public.product;
create policy "product_authenticated_read"
  on public.product
  for select
  to authenticated
  using (true);

drop policy if exists "product_owner_all" on public.product;
create policy "product_owner_all"
  on public.product
  for all
  to authenticated
  using (
    exhibitor_user_id = auth.uid()
    or private.is_exhibitor_profile_owner(exhibitor_profile_id)
  )
  with check (
    exhibitor_user_id = auth.uid()
    or private.is_exhibitor_profile_owner(exhibitor_profile_id)
  );

drop policy if exists "catalog_item_admin_all" on public.catalog_item;
create policy "catalog_item_admin_all"
  on public.catalog_item
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "catalog_item_authenticated_read" on public.catalog_item;
create policy "catalog_item_authenticated_read"
  on public.catalog_item
  for select
  to authenticated
  using (true);

drop policy if exists "catalog_item_owner_all" on public.catalog_item;
create policy "catalog_item_owner_all"
  on public.catalog_item
  for all
  to authenticated
  using (
    exhibitor_user_id = auth.uid()
    or private.is_exhibitor_profile_owner(exhibitor_profile_id)
  )
  with check (
    exhibitor_user_id = auth.uid()
    or private.is_exhibitor_profile_owner(exhibitor_profile_id)
  );

drop policy if exists "connection_admin_all" on public.connection;
create policy "connection_admin_all"
  on public.connection
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "connection_participant_all" on public.connection;
create policy "connection_participant_all"
  on public.connection
  for all
  to authenticated
  using (auth.uid() in (exhibitor_user_id, buyer_user_id))
  with check (auth.uid() in (exhibitor_user_id, buyer_user_id));

drop policy if exists "rfi_admin_all" on public.rfi;
create policy "rfi_admin_all"
  on public.rfi
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "rfi_participant_all" on public.rfi;
create policy "rfi_participant_all"
  on public.rfi
  for all
  to authenticated
  using (auth.uid() in (buyer_user_id, exhibitor_user_id))
  with check (auth.uid() in (buyer_user_id, exhibitor_user_id));

drop policy if exists "meeting_admin_all" on public.meeting;
create policy "meeting_admin_all"
  on public.meeting
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "meeting_participant_read" on public.meeting;
create policy "meeting_participant_read"
  on public.meeting
  for select
  to authenticated
  using (auth.uid() in (proposed_by, proposed_to));

drop policy if exists "meeting_participant_update" on public.meeting;
create policy "meeting_participant_update"
  on public.meeting
  for update
  to authenticated
  using (auth.uid() in (proposed_by, proposed_to))
  with check (auth.uid() in (proposed_by, proposed_to));

drop policy if exists "meeting_participant_delete" on public.meeting;
create policy "meeting_participant_delete"
  on public.meeting
  for delete
  to authenticated
  using (auth.uid() in (proposed_by, proposed_to));

drop policy if exists "meeting_creator_insert" on public.meeting;
create policy "meeting_creator_insert"
  on public.meeting
  for insert
  to authenticated
  with check (proposed_by = auth.uid());

drop policy if exists "meeting_request_admin_all" on public.meeting_request;
create policy "meeting_request_admin_all"
  on public.meeting_request
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "meeting_request_participant_read" on public.meeting_request;
create policy "meeting_request_participant_read"
  on public.meeting_request
  for select
  to authenticated
  using (auth.uid() in (requested_by_user_id, target_exhibitor_user_id));

drop policy if exists "meeting_request_participant_update" on public.meeting_request;
create policy "meeting_request_participant_update"
  on public.meeting_request
  for update
  to authenticated
  using (auth.uid() in (requested_by_user_id, target_exhibitor_user_id))
  with check (auth.uid() in (requested_by_user_id, target_exhibitor_user_id));

drop policy if exists "meeting_request_participant_delete" on public.meeting_request;
create policy "meeting_request_participant_delete"
  on public.meeting_request
  for delete
  to authenticated
  using (auth.uid() in (requested_by_user_id, target_exhibitor_user_id));

drop policy if exists "meeting_request_requester_insert" on public.meeting_request;
create policy "meeting_request_requester_insert"
  on public.meeting_request
  for insert
  to authenticated
  with check (requested_by_user_id = auth.uid());

drop policy if exists "media_admin_all" on public.media;
create policy "media_admin_all"
  on public.media
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "media_access_read" on public.media;
create policy "media_access_read"
  on public.media
  for select
  to authenticated
  using (
    uploaded_by = auth.uid()
    or (connection_id is not null and private.is_connection_participant(connection_id))
  );

drop policy if exists "media_owner_insert" on public.media;
create policy "media_owner_insert"
  on public.media
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and (connection_id is null or private.is_connection_participant(connection_id))
  );

drop policy if exists "media_owner_update" on public.media;
create policy "media_owner_update"
  on public.media
  for update
  to authenticated
  using (uploaded_by = auth.uid())
  with check (
    uploaded_by = auth.uid()
    and (connection_id is null or private.is_connection_participant(connection_id))
  );

drop policy if exists "media_owner_delete" on public.media;
create policy "media_owner_delete"
  on public.media
  for delete
  to authenticated
  using (uploaded_by = auth.uid());

drop policy if exists "saved_booth_admin_all" on public.saved_booth;
create policy "saved_booth_admin_all"
  on public.saved_booth
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "saved_booth_buyer_all" on public.saved_booth;
create policy "saved_booth_buyer_all"
  on public.saved_booth
  for all
  to authenticated
  using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

drop policy if exists "saved_product_admin_all" on public.saved_product;
create policy "saved_product_admin_all"
  on public.saved_product
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "saved_product_buyer_all" on public.saved_product;
create policy "saved_product_buyer_all"
  on public.saved_product
  for all
  to authenticated
  using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

drop policy if exists "lead_profile_admin_all" on public.lead_profile;
create policy "lead_profile_admin_all"
  on public.lead_profile
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "lead_profile_member_all" on public.lead_profile;
create policy "lead_profile_member_all"
  on public.lead_profile
  for all
  to authenticated
  using (
    private.is_company_owner(company_id)
    or representative_user_id = auth.uid()
    or buyer_user_id = auth.uid()
  )
  with check (
    private.is_company_owner(company_id)
    or representative_user_id = auth.uid()
    or buyer_user_id = auth.uid()
  );

drop policy if exists "lead_intelligence_admin_all" on public.lead_intelligence;
create policy "lead_intelligence_admin_all"
  on public.lead_intelligence
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "lead_intelligence_member_all" on public.lead_intelligence;
create policy "lead_intelligence_member_all"
  on public.lead_intelligence
  for all
  to authenticated
  using (
    private.is_company_owner(company_id)
    or exhibitor_user_id = auth.uid()
    or buyer_user_id = auth.uid()
    or private.is_lead_profile_member(lead_profile_id)
  )
  with check (
    private.is_company_owner(company_id)
    or exhibitor_user_id = auth.uid()
    or buyer_user_id = auth.uid()
    or private.is_lead_profile_member(lead_profile_id)
  );

drop policy if exists "lead_interaction_admin_all" on public.lead_interaction;
create policy "lead_interaction_admin_all"
  on public.lead_interaction
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "lead_interaction_participant_all" on public.lead_interaction;
create policy "lead_interaction_participant_all"
  on public.lead_interaction
  for all
  to authenticated
  using (auth.uid() in (buyer_user_id, exhibitor_user_id))
  with check (auth.uid() in (buyer_user_id, exhibitor_user_id));

drop policy if exists "activity_admin_all" on public.activity;
create policy "activity_admin_all"
  on public.activity
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "activity_actor_company_all" on public.activity;
create policy "activity_actor_company_all"
  on public.activity
  for all
  to authenticated
  using (
    user_id = auth.uid()
    or target_user_id = auth.uid()
    or private.is_company_owner(company_id)
    or private.is_company_owner(target_company_id)
  )
  with check (
    user_id = auth.uid()
    or target_user_id = auth.uid()
    or private.is_company_owner(company_id)
    or private.is_company_owner(target_company_id)
  );

drop policy if exists "notification_admin_all" on public.notification;
create policy "notification_admin_all"
  on public.notification
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "notification_recipient_read" on public.notification;
create policy "notification_recipient_read"
  on public.notification
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "notification_recipient_update" on public.notification;
create policy "notification_recipient_update"
  on public.notification
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notification_recipient_delete" on public.notification;
create policy "notification_recipient_delete"
  on public.notification
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "notification_authenticated_insert" on public.notification;
create policy "notification_authenticated_insert"
  on public.notification
  for insert
  to authenticated
  with check (auth.uid() is not null and user_id is not null);

drop policy if exists "sourcing_project_admin_all" on public.sourcing_project;
create policy "sourcing_project_admin_all"
  on public.sourcing_project
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "sourcing_project_buyer_all" on public.sourcing_project;
create policy "sourcing_project_buyer_all"
  on public.sourcing_project
  for all
  to authenticated
  using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

drop policy if exists "project_supplier_mapping_admin_all" on public.project_supplier_mapping;
create policy "project_supplier_mapping_admin_all"
  on public.project_supplier_mapping
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "project_supplier_mapping_member_all" on public.project_supplier_mapping;
create policy "project_supplier_mapping_member_all"
  on public.project_supplier_mapping
  for all
  to authenticated
  using (
    buyer_id = auth.uid()
    or exhibitor_user_id = auth.uid()
    or private.is_sourcing_project_member(project_id)
  )
  with check (
    buyer_id = auth.uid()
    or exhibitor_user_id = auth.uid()
    or private.is_sourcing_project_member(project_id)
  );

drop policy if exists "match_recommendation_admin_all" on public.match_recommendation;
create policy "match_recommendation_admin_all"
  on public.match_recommendation
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "match_recommendation_member_all" on public.match_recommendation;
create policy "match_recommendation_member_all"
  on public.match_recommendation
  for all
  to authenticated
  using (
    buyer_user_id = auth.uid()
    or recommended_exhibitor_user_id = auth.uid()
    or private.is_company_owner(buyer_company_id)
    or private.is_company_owner(recommended_company_id)
  )
  with check (
    buyer_user_id = auth.uid()
    or recommended_exhibitor_user_id = auth.uid()
    or private.is_company_owner(buyer_company_id)
    or private.is_company_owner(recommended_company_id)
  );

drop policy if exists "opportunity_post_admin_all" on public.opportunity_post;
create policy "opportunity_post_admin_all"
  on public.opportunity_post
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "opportunity_post_owner_all" on public.opportunity_post;
create policy "opportunity_post_owner_all"
  on public.opportunity_post
  for all
  to authenticated
  using (posted_by_user_id = auth.uid())
  with check (posted_by_user_id = auth.uid());

drop policy if exists "integration_connection_admin_all" on public.integration_connection;
create policy "integration_connection_admin_all"
  on public.integration_connection
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "integration_connection_user_all" on public.integration_connection;
create policy "integration_connection_user_all"
  on public.integration_connection
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "integration_sync_log_admin_all" on public.integration_sync_log;
create policy "integration_sync_log_admin_all"
  on public.integration_sync_log
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "integration_sync_log_member_all" on public.integration_sync_log;
create policy "integration_sync_log_member_all"
  on public.integration_sync_log
  for all
  to authenticated
  using (
    user_id = auth.uid()
    or private.is_integration_connection_owner(connection_id)
  )
  with check (
    user_id = auth.uid()
    or private.is_integration_connection_owner(connection_id)
  );

drop policy if exists "nfc_profile_admin_all" on public.nfc_profile;
create policy "nfc_profile_admin_all"
  on public.nfc_profile
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "nfc_profile_authenticated_read" on public.nfc_profile;
create policy "nfc_profile_authenticated_read"
  on public.nfc_profile
  for select
  to authenticated
  using (true);

drop policy if exists "nfc_profile_owner_all" on public.nfc_profile;
create policy "nfc_profile_owner_all"
  on public.nfc_profile
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "nfc_interaction_admin_all" on public.nfc_interaction;
create policy "nfc_interaction_admin_all"
  on public.nfc_interaction
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "nfc_interaction_participant_read" on public.nfc_interaction;
create policy "nfc_interaction_participant_read"
  on public.nfc_interaction
  for select
  to authenticated
  using (auth.uid() in (initiator_user_id, target_user_id));

drop policy if exists "nfc_interaction_participant_update" on public.nfc_interaction;
create policy "nfc_interaction_participant_update"
  on public.nfc_interaction
  for update
  to authenticated
  using (auth.uid() in (initiator_user_id, target_user_id))
  with check (auth.uid() in (initiator_user_id, target_user_id));

drop policy if exists "nfc_interaction_participant_delete" on public.nfc_interaction;
create policy "nfc_interaction_participant_delete"
  on public.nfc_interaction
  for delete
  to authenticated
  using (auth.uid() in (initiator_user_id, target_user_id));

drop policy if exists "nfc_interaction_initiator_insert" on public.nfc_interaction;
create policy "nfc_interaction_initiator_insert"
  on public.nfc_interaction
  for insert
  to authenticated
  with check (initiator_user_id = auth.uid());

drop policy if exists "nfc_product_tag_admin_all" on public.nfc_product_tag;
create policy "nfc_product_tag_admin_all"
  on public.nfc_product_tag
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "nfc_product_tag_owner_all" on public.nfc_product_tag;
create policy "nfc_product_tag_owner_all"
  on public.nfc_product_tag
  for all
  to authenticated
  using (
    supplier_user_id = auth.uid()
    or private.is_product_owner(product_id)
  )
  with check (
    supplier_user_id = auth.uid()
    or private.is_product_owner(product_id)
  );

drop policy if exists "scanned_contact_admin_all" on public.scanned_contact;
create policy "scanned_contact_admin_all"
  on public.scanned_contact
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "scanned_contact_scanner_all" on public.scanned_contact;
create policy "scanned_contact_scanner_all"
  on public.scanned_contact
  for all
  to authenticated
  using (scanned_by_user_id = auth.uid())
  with check (scanned_by_user_id = auth.uid());

drop policy if exists "billing_subscription_admin_all" on public.billing_subscription;
create policy "billing_subscription_admin_all"
  on public.billing_subscription
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "billing_subscription_user_read" on public.billing_subscription;
create policy "billing_subscription_user_read"
  on public.billing_subscription
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "billing_transaction_admin_all" on public.billing_transaction;
create policy "billing_transaction_admin_all"
  on public.billing_transaction
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "billing_transaction_member_read" on public.billing_transaction;
create policy "billing_transaction_member_read"
  on public.billing_transaction
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or private.is_billing_subscription_owner(subscription_id)
  );

drop policy if exists "premium_booth_subscription_admin_all" on public.premium_booth_subscription;
create policy "premium_booth_subscription_admin_all"
  on public.premium_booth_subscription
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "premium_booth_subscription_owner_read" on public.premium_booth_subscription;
create policy "premium_booth_subscription_owner_read"
  on public.premium_booth_subscription
  for select
  to authenticated
  using (exhibitor_id = auth.uid());

drop policy if exists "sponsored_listing_admin_all" on public.sponsored_listing;
create policy "sponsored_listing_admin_all"
  on public.sponsored_listing
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "sponsored_listing_owner_all" on public.sponsored_listing;
create policy "sponsored_listing_owner_all"
  on public.sponsored_listing
  for all
  to authenticated
  using (exhibitor_user_id = auth.uid())
  with check (exhibitor_user_id = auth.uid());

drop policy if exists "support_ticket_admin_all" on public.support_ticket;
create policy "support_ticket_admin_all"
  on public.support_ticket
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "support_ticket_participant_all" on public.support_ticket;
create policy "support_ticket_participant_all"
  on public.support_ticket
  for all
  to authenticated
  using (auth.uid() in (created_by, assigned_to))
  with check (auth.uid() in (created_by, assigned_to));

drop policy if exists "admin_access_log_admin_all" on public.admin_access_log;
create policy "admin_access_log_admin_all"
  on public.admin_access_log
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "system_alert_admin_all" on public.system_alert;
create policy "system_alert_admin_all"
  on public.system_alert
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "stress_test_result_admin_all" on public.stress_test_result;
create policy "stress_test_result_admin_all"
  on public.stress_test_result
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

commit;
