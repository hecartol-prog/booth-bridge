begin;

create or replace function private.storage_object_ref(target_bucket text, object_name text)
returns text
language sql
immutable
as $$
  select target_bucket || '/' || object_name;
$$;

create or replace function private.is_shared_media_asset(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exhibitor_profile ep
    where ep.logo_url = private.storage_object_ref('boothbridge-media', object_name)
  )
  or exists (
    select 1
    from public.product p
    where p.image_url = private.storage_object_ref('boothbridge-media', object_name)
  )
  or exists (
    select 1
    from public.catalog_item ci
    where ci.thumbnail_url = private.storage_object_ref('boothbridge-media', object_name)
  );
$$;

create or replace function private.is_shared_catalog_asset(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.catalog_item ci
    where ci.file_url = private.storage_object_ref('boothbridge-assets', object_name)
  )
  or exists (
    select 1
    from public.exhibitor_profile ep
    where ep.catalogue_url = private.storage_object_ref('boothbridge-assets', object_name)
  );
$$;

drop policy if exists "storage_admin_select" on storage.objects;
create policy "storage_admin_select"
  on storage.objects
  for select
  to authenticated
  using (
    private.is_admin()
    and bucket_id in ('boothbridge-media', 'boothbridge-assets', 'boothbridge-ocr')
  );

drop policy if exists "storage_admin_insert" on storage.objects;
create policy "storage_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    private.is_admin()
    and bucket_id in ('boothbridge-media', 'boothbridge-assets', 'boothbridge-ocr')
  );

drop policy if exists "storage_admin_update" on storage.objects;
create policy "storage_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    private.is_admin()
    and bucket_id in ('boothbridge-media', 'boothbridge-assets', 'boothbridge-ocr')
  )
  with check (
    private.is_admin()
    and bucket_id in ('boothbridge-media', 'boothbridge-assets', 'boothbridge-ocr')
  );

drop policy if exists "storage_admin_delete" on storage.objects;
create policy "storage_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    private.is_admin()
    and bucket_id in ('boothbridge-media', 'boothbridge-assets', 'boothbridge-ocr')
  );

drop policy if exists "storage_media_owner_select" on storage.objects;
create policy "storage_media_owner_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'boothbridge-media'
    and (storage.foldername(name))[1] in ('uploads', 'logos', 'products')
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or private.is_shared_media_asset(name)
    )
  );

drop policy if exists "storage_media_owner_insert" on storage.objects;
create policy "storage_media_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'boothbridge-media'
    and (storage.foldername(name))[1] in ('uploads', 'logos', 'products')
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "storage_media_owner_update" on storage.objects;
create policy "storage_media_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'boothbridge-media'
    and (storage.foldername(name))[1] in ('uploads', 'logos', 'products')
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'boothbridge-media'
    and (storage.foldername(name))[1] in ('uploads', 'logos', 'products')
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "storage_media_owner_delete" on storage.objects;
create policy "storage_media_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'boothbridge-media'
    and (storage.foldername(name))[1] in ('uploads', 'logos', 'products')
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "storage_assets_scope_select" on storage.objects;
create policy "storage_assets_scope_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'boothbridge-assets'
    and (
      (
        (storage.foldername(name))[1] = 'companies'
        and (storage.foldername(name))[3] = 'catalogs'
        and (
          private.is_asset_folder_owner((storage.foldername(name))[2])
          or private.is_shared_catalog_asset(name)
        )
      )
      or (
        (storage.foldername(name))[1] = 'uploads'
        and (storage.foldername(name))[3] = 'catalogs'
        and (
          (storage.foldername(name))[2] = auth.uid()::text
          or private.is_shared_catalog_asset(name)
        )
      )
      or (
        (storage.foldername(name))[1] = 'events'
        and (storage.foldername(name))[3] = 'branding'
        and private.is_admin()
      )
    )
  );

drop policy if exists "storage_assets_scope_insert" on storage.objects;
create policy "storage_assets_scope_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'boothbridge-assets'
    and (
      (
        (storage.foldername(name))[1] = 'companies'
        and (storage.foldername(name))[3] = 'catalogs'
        and private.is_asset_folder_owner((storage.foldername(name))[2])
      )
      or (
        (storage.foldername(name))[1] = 'uploads'
        and (storage.foldername(name))[2] = auth.uid()::text
        and (storage.foldername(name))[3] = 'catalogs'
      )
      or (
        (storage.foldername(name))[1] = 'events'
        and (storage.foldername(name))[3] = 'branding'
        and private.is_admin()
      )
    )
  );

drop policy if exists "storage_assets_scope_update" on storage.objects;
create policy "storage_assets_scope_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'boothbridge-assets'
    and (
      (
        (storage.foldername(name))[1] = 'companies'
        and (storage.foldername(name))[3] = 'catalogs'
        and private.is_asset_folder_owner((storage.foldername(name))[2])
      )
      or (
        (storage.foldername(name))[1] = 'uploads'
        and (storage.foldername(name))[2] = auth.uid()::text
        and (storage.foldername(name))[3] = 'catalogs'
      )
      or (
        (storage.foldername(name))[1] = 'events'
        and (storage.foldername(name))[3] = 'branding'
        and private.is_admin()
      )
    )
  )
  with check (
    bucket_id = 'boothbridge-assets'
    and (
      (
        (storage.foldername(name))[1] = 'companies'
        and (storage.foldername(name))[3] = 'catalogs'
        and private.is_asset_folder_owner((storage.foldername(name))[2])
      )
      or (
        (storage.foldername(name))[1] = 'uploads'
        and (storage.foldername(name))[2] = auth.uid()::text
        and (storage.foldername(name))[3] = 'catalogs'
      )
      or (
        (storage.foldername(name))[1] = 'events'
        and (storage.foldername(name))[3] = 'branding'
        and private.is_admin()
      )
    )
  );

drop policy if exists "storage_assets_scope_delete" on storage.objects;
create policy "storage_assets_scope_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'boothbridge-assets'
    and (
      (
        (storage.foldername(name))[1] = 'companies'
        and (storage.foldername(name))[3] = 'catalogs'
        and private.is_asset_folder_owner((storage.foldername(name))[2])
      )
      or (
        (storage.foldername(name))[1] = 'uploads'
        and (storage.foldername(name))[2] = auth.uid()::text
        and (storage.foldername(name))[3] = 'catalogs'
      )
      or (
        (storage.foldername(name))[1] = 'events'
        and (storage.foldername(name))[3] = 'branding'
        and private.is_admin()
      )
    )
  );

drop policy if exists "storage_ocr_owner_select" on storage.objects;
create policy "storage_ocr_owner_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'boothbridge-ocr'
    and (storage.foldername(name))[1] = 'scans'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "storage_ocr_owner_insert" on storage.objects;
create policy "storage_ocr_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'boothbridge-ocr'
    and (storage.foldername(name))[1] = 'scans'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "storage_ocr_owner_update" on storage.objects;
create policy "storage_ocr_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'boothbridge-ocr'
    and (storage.foldername(name))[1] = 'scans'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'boothbridge-ocr'
    and (storage.foldername(name))[1] = 'scans'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "storage_ocr_owner_delete" on storage.objects;
create policy "storage_ocr_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'boothbridge-ocr'
    and (storage.foldername(name))[1] = 'scans'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

commit;
