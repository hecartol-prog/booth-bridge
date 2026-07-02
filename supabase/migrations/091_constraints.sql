alter table "public"."nfc_profile"
  add constraint "uq_nfc_profile_nfc_identifier" unique ("nfc_identifier");

alter table "public"."company" add constraint "fk_company_created_by_user_id" foreign key ("created_by_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."exhibitor_profile" add constraint "fk_exhibitor_profile_user_id" foreign key ("user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."exhibitor_profile" add constraint "fk_exhibitor_profile_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;

alter table "public"."buyer_profile" add constraint "fk_buyer_profile_user_id" foreign key ("user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."verification_profile" add constraint "fk_verification_profile_company_id" foreign key ("company_id") references "public"."company" ("id") on delete set null deferrable initially deferred;
alter table "public"."verification_profile" add constraint "fk_verification_profile_reviewed_by_user_id" foreign key ("reviewed_by_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."booth" add constraint "fk_booth_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;
alter table "public"."booth" add constraint "fk_booth_company_id" foreign key ("company_id") references "public"."company" ("id") on delete set null deferrable initially deferred;
alter table "public"."booth" add constraint "fk_booth_exhibitor_user_id" foreign key ("exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."booth" add constraint "fk_booth_exhibitor_profile_id" foreign key ("exhibitor_profile_id") references "public"."exhibitor_profile" ("id") on delete set null deferrable initially deferred;
alter table "public"."booth" add constraint "fk_booth_primary_representative_id" foreign key ("primary_representative_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."booth" add constraint "fk_booth_secondary_representative_id" foreign key ("secondary_representative_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."product" add constraint "fk_product_exhibitor_user_id" foreign key ("exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."product" add constraint "fk_product_exhibitor_profile_id" foreign key ("exhibitor_profile_id") references "public"."exhibitor_profile" ("id") on delete set null deferrable initially deferred;

alter table "public"."catalog_item" add constraint "fk_catalog_item_exhibitor_user_id" foreign key ("exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."catalog_item" add constraint "fk_catalog_item_exhibitor_profile_id" foreign key ("exhibitor_profile_id") references "public"."exhibitor_profile" ("id") on delete set null deferrable initially deferred;

alter table "public"."connection" add constraint "fk_connection_exhibitor_user_id" foreign key ("exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."connection" add constraint "fk_connection_buyer_user_id" foreign key ("buyer_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."connection" add constraint "fk_connection_exhibitor_profile_id" foreign key ("exhibitor_profile_id") references "public"."exhibitor_profile" ("id") on delete set null deferrable initially deferred;
alter table "public"."connection" add constraint "fk_connection_buyer_profile_id" foreign key ("buyer_profile_id") references "public"."buyer_profile" ("id") on delete set null deferrable initially deferred;

alter table "public"."rfi" add constraint "fk_rfi_connection_id" foreign key ("connection_id") references "public"."connection" ("id") on delete set null deferrable initially deferred;
alter table "public"."rfi" add constraint "fk_rfi_buyer_user_id" foreign key ("buyer_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."rfi" add constraint "fk_rfi_exhibitor_user_id" foreign key ("exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."meeting" add constraint "fk_meeting_connection_id" foreign key ("connection_id") references "public"."connection" ("id") on delete set null deferrable initially deferred;
alter table "public"."meeting" add constraint "fk_meeting_proposed_by" foreign key ("proposed_by") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."meeting" add constraint "fk_meeting_proposed_to" foreign key ("proposed_to") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."meeting_request" add constraint "fk_meeting_request_requested_by_user_id" foreign key ("requested_by_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."meeting_request" add constraint "fk_meeting_request_target_exhibitor_user_id" foreign key ("target_exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."meeting_request" add constraint "fk_meeting_request_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;
alter table "public"."meeting_request" add constraint "fk_meeting_request_booth_id" foreign key ("booth_id") references "public"."booth" ("id") on delete set null deferrable initially deferred;
alter table "public"."meeting_request" add constraint "fk_meeting_request_meeting_id" foreign key ("meeting_id") references "public"."meeting" ("id") on delete set null deferrable initially deferred;

alter table "public"."media" add constraint "fk_media_connection_id" foreign key ("connection_id") references "public"."connection" ("id") on delete set null deferrable initially deferred;
alter table "public"."media" add constraint "fk_media_uploaded_by" foreign key ("uploaded_by") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."saved_booth" add constraint "fk_saved_booth_buyer_id" foreign key ("buyer_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."saved_booth" add constraint "fk_saved_booth_exhibitor_user_id" foreign key ("exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."saved_booth" add constraint "fk_saved_booth_exhibitor_profile_id" foreign key ("exhibitor_profile_id") references "public"."exhibitor_profile" ("id") on delete set null deferrable initially deferred;
alter table "public"."saved_booth" add constraint "fk_saved_booth_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;

alter table "public"."saved_product" add constraint "fk_saved_product_buyer_id" foreign key ("buyer_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."saved_product" add constraint "fk_saved_product_product_id" foreign key ("product_id") references "public"."product" ("id") on delete set null deferrable initially deferred;
alter table "public"."saved_product" add constraint "fk_saved_product_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;
alter table "public"."saved_product" add constraint "fk_saved_product_exhibitor_user_id" foreign key ("exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."lead_profile" add constraint "fk_lead_profile_company_id" foreign key ("company_id") references "public"."company" ("id") on delete set null deferrable initially deferred;
alter table "public"."lead_profile" add constraint "fk_lead_profile_source_event_id" foreign key ("source_event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;
alter table "public"."lead_profile" add constraint "fk_lead_profile_source_booth_id" foreign key ("source_booth_id") references "public"."booth" ("id") on delete set null deferrable initially deferred;
alter table "public"."lead_profile" add constraint "fk_lead_profile_representative_user_id" foreign key ("representative_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."lead_profile" add constraint "fk_lead_profile_buyer_user_id" foreign key ("buyer_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."lead_intelligence" add constraint "fk_lead_intelligence_lead_profile_id" foreign key ("lead_profile_id") references "public"."lead_profile" ("id") on delete set null deferrable initially deferred;
alter table "public"."lead_intelligence" add constraint "fk_lead_intelligence_buyer_user_id" foreign key ("buyer_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."lead_intelligence" add constraint "fk_lead_intelligence_exhibitor_user_id" foreign key ("exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."lead_intelligence" add constraint "fk_lead_intelligence_company_id" foreign key ("company_id") references "public"."company" ("id") on delete set null deferrable initially deferred;
alter table "public"."lead_intelligence" add constraint "fk_lead_intelligence_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;

alter table "public"."lead_interaction" add constraint "fk_lead_interaction_buyer_user_id" foreign key ("buyer_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."lead_interaction" add constraint "fk_lead_interaction_exhibitor_user_id" foreign key ("exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."activity" add constraint "fk_activity_user_id" foreign key ("user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."activity" add constraint "fk_activity_company_id" foreign key ("company_id") references "public"."company" ("id") on delete set null deferrable initially deferred;
alter table "public"."activity" add constraint "fk_activity_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;
alter table "public"."activity" add constraint "fk_activity_booth_id" foreign key ("booth_id") references "public"."booth" ("id") on delete set null deferrable initially deferred;
alter table "public"."activity" add constraint "fk_activity_product_id" foreign key ("product_id") references "public"."product" ("id") on delete set null deferrable initially deferred;
alter table "public"."activity" add constraint "fk_activity_lead_id" foreign key ("lead_id") references "public"."lead_profile" ("id") on delete set null deferrable initially deferred;
alter table "public"."activity" add constraint "fk_activity_meeting_id" foreign key ("meeting_id") references "public"."meeting" ("id") on delete set null deferrable initially deferred;
alter table "public"."activity" add constraint "fk_activity_rfi_id" foreign key ("rfi_id") references "public"."rfi" ("id") on delete set null deferrable initially deferred;
alter table "public"."activity" add constraint "fk_activity_target_company_id" foreign key ("target_company_id") references "public"."company" ("id") on delete set null deferrable initially deferred;
alter table "public"."activity" add constraint "fk_activity_target_user_id" foreign key ("target_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."notification" add constraint "fk_notification_user_id" foreign key ("user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."sourcing_project" add constraint "fk_sourcing_project_buyer_id" foreign key ("buyer_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."project_supplier_mapping" add constraint "fk_project_supplier_mapping_project_id" foreign key ("project_id") references "public"."sourcing_project" ("id") on delete set null deferrable initially deferred;
alter table "public"."project_supplier_mapping" add constraint "fk_project_supplier_mapping_buyer_id" foreign key ("buyer_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."project_supplier_mapping" add constraint "fk_project_supplier_mapping_exhibitor_user_id" foreign key ("exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."project_supplier_mapping" add constraint "fk_project_supplier_mapping_exhibitor_profile_id" foreign key ("exhibitor_profile_id") references "public"."exhibitor_profile" ("id") on delete set null deferrable initially deferred;

alter table "public"."match_recommendation" add constraint "fk_match_recommendation_buyer_user_id" foreign key ("buyer_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."match_recommendation" add constraint "fk_match_recommendation_buyer_company_id" foreign key ("buyer_company_id") references "public"."company" ("id") on delete set null deferrable initially deferred;
alter table "public"."match_recommendation" add constraint "fk_match_recommendation_recommended_exhibitor_user_id" foreign key ("recommended_exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."match_recommendation" add constraint "fk_match_recommendation_recommended_company_id" foreign key ("recommended_company_id") references "public"."company" ("id") on delete set null deferrable initially deferred;
alter table "public"."match_recommendation" add constraint "fk_match_recommendation_recommended_product_id" foreign key ("recommended_product_id") references "public"."product" ("id") on delete set null deferrable initially deferred;
alter table "public"."match_recommendation" add constraint "fk_match_recommendation_recommended_event_id" foreign key ("recommended_event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;
alter table "public"."match_recommendation" add constraint "fk_match_recommendation_recommended_booth_id" foreign key ("recommended_booth_id") references "public"."booth" ("id") on delete set null deferrable initially deferred;

alter table "public"."opportunity_post" add constraint "fk_opportunity_post_posted_by_user_id" foreign key ("posted_by_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."integration_connection" add constraint "fk_integration_connection_user_id" foreign key ("user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."integration_sync_log" add constraint "fk_integration_sync_log_connection_id" foreign key ("connection_id") references "public"."integration_connection" ("id") on delete set null deferrable initially deferred;
alter table "public"."integration_sync_log" add constraint "fk_integration_sync_log_user_id" foreign key ("user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."nfc_profile" add constraint "fk_nfc_profile_user_id" foreign key ("user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."nfc_profile" add constraint "fk_nfc_profile_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;

alter table "public"."nfc_interaction" add constraint "fk_nfc_interaction_initiator_user_id" foreign key ("initiator_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."nfc_interaction" add constraint "fk_nfc_interaction_target_user_id" foreign key ("target_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."nfc_interaction" add constraint "fk_nfc_interaction_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;
alter table "public"."nfc_interaction" add constraint "fk_nfc_interaction_nfc_identifier" foreign key ("nfc_identifier") references "public"."nfc_profile" ("nfc_identifier") on delete set null deferrable initially deferred;

alter table "public"."nfc_product_tag" add constraint "fk_nfc_product_tag_product_id" foreign key ("product_id") references "public"."product" ("id") on delete set null deferrable initially deferred;
alter table "public"."nfc_product_tag" add constraint "fk_nfc_product_tag_supplier_user_id" foreign key ("supplier_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."nfc_product_tag" add constraint "fk_nfc_product_tag_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;

alter table "public"."scanned_contact" add constraint "fk_scanned_contact_scanned_by_user_id" foreign key ("scanned_by_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."scanned_contact" add constraint "fk_scanned_contact_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;
alter table "public"."scanned_contact" add constraint "fk_scanned_contact_linked_lead_id" foreign key ("linked_lead_id") references "public"."lead_profile" ("id") on delete set null deferrable initially deferred;
alter table "public"."scanned_contact" add constraint "fk_scanned_contact_linked_project_id" foreign key ("linked_project_id") references "public"."sourcing_project" ("id") on delete set null deferrable initially deferred;

alter table "public"."billing_subscription" add constraint "fk_billing_subscription_user_id" foreign key ("user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."billing_transaction" add constraint "fk_billing_transaction_user_id" foreign key ("user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."billing_transaction" add constraint "fk_billing_transaction_subscription_id" foreign key ("subscription_id") references "public"."billing_subscription" ("id") on delete set null deferrable initially deferred;

alter table "public"."premium_booth_subscription" add constraint "fk_premium_booth_subscription_exhibitor_id" foreign key ("exhibitor_id") references "public"."user" ("id") on delete set null deferrable initially deferred;

alter table "public"."sponsored_listing" add constraint "fk_sponsored_listing_exhibitor_user_id" foreign key ("exhibitor_user_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."sponsored_listing" add constraint "fk_sponsored_listing_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;

alter table "public"."support_ticket" add constraint "fk_support_ticket_created_by" foreign key ("created_by") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."support_ticket" add constraint "fk_support_ticket_assigned_to" foreign key ("assigned_to") references "public"."user" ("id") on delete set null deferrable initially deferred;
alter table "public"."support_ticket" add constraint "fk_support_ticket_event_id" foreign key ("event_id") references "public"."event" ("id") on delete set null deferrable initially deferred;

alter table "public"."admin_access_log" add constraint "fk_admin_access_log_admin_id" foreign key ("admin_id") references "public"."user" ("id") on delete set null deferrable initially deferred;
