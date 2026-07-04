begin;

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
    and (storage.foldername(name))[2] = auth.uid()::text
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
        and private.is_asset_folder_owner((storage.foldername(name))[2])
      )
      or (
        (storage.foldername(name))[1] = 'uploads'
        and (storage.foldername(name))[2] = auth.uid()::text
        and (storage.foldername(name))[3] = 'catalogs'
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
