create index if not exists "idx_user_legacy_base44_id" on "public"."user" ("legacy_base44_id");
create index if not exists "idx_user_profile_id" on "public"."user" ("profile_id");

create index if not exists "idx_company_legacy_base44_id" on "public"."company" ("legacy_base44_id");
create index if not exists "idx_company_created_by_user_id" on "public"."company" ("created_by_user_id");

create index if not exists "idx_event_legacy_base44_id" on "public"."event" ("legacy_base44_id");
create index if not exists "idx_event_status" on "public"."event" ("status");
create index if not exists "idx_event_event_status" on "public"."event" ("event_status");

create index if not exists "idx_exhibitor_profile_legacy_base44_id" on "public"."exhibitor_profile" ("legacy_base44_id");
create index if not exists "idx_exhibitor_profile_user_id" on "public"."exhibitor_profile" ("user_id");
create index if not exists "idx_exhibitor_profile_event_id" on "public"."exhibitor_profile" ("event_id");

create index if not exists "idx_buyer_profile_legacy_base44_id" on "public"."buyer_profile" ("legacy_base44_id");
create index if not exists "idx_buyer_profile_user_id" on "public"."buyer_profile" ("user_id");

create index if not exists "idx_verification_profile_legacy_base44_id" on "public"."verification_profile" ("legacy_base44_id");
create index if not exists "idx_verification_profile_company_id" on "public"."verification_profile" ("company_id");
create index if not exists "idx_verification_profile_reviewed_by_user_id" on "public"."verification_profile" ("reviewed_by_user_id");

create index if not exists "idx_booth_legacy_base44_id" on "public"."booth" ("legacy_base44_id");
create index if not exists "idx_booth_event_id" on "public"."booth" ("event_id");
create index if not exists "idx_booth_company_id" on "public"."booth" ("company_id");
create index if not exists "idx_booth_exhibitor_user_id" on "public"."booth" ("exhibitor_user_id");
create index if not exists "idx_booth_exhibitor_profile_id" on "public"."booth" ("exhibitor_profile_id");
create index if not exists "idx_booth_primary_representative_id" on "public"."booth" ("primary_representative_id");
create index if not exists "idx_booth_secondary_representative_id" on "public"."booth" ("secondary_representative_id");

create index if not exists "idx_product_legacy_base44_id" on "public"."product" ("legacy_base44_id");
create index if not exists "idx_product_exhibitor_user_id" on "public"."product" ("exhibitor_user_id");
create index if not exists "idx_product_exhibitor_profile_id" on "public"."product" ("exhibitor_profile_id");

create index if not exists "idx_catalog_item_legacy_base44_id" on "public"."catalog_item" ("legacy_base44_id");
create index if not exists "idx_catalog_item_exhibitor_user_id" on "public"."catalog_item" ("exhibitor_user_id");
create index if not exists "idx_catalog_item_exhibitor_profile_id" on "public"."catalog_item" ("exhibitor_profile_id");

create index if not exists "idx_connection_legacy_base44_id" on "public"."connection" ("legacy_base44_id");
create index if not exists "idx_connection_exhibitor_user_id" on "public"."connection" ("exhibitor_user_id");
create index if not exists "idx_connection_buyer_user_id" on "public"."connection" ("buyer_user_id");
create index if not exists "idx_connection_exhibitor_profile_id" on "public"."connection" ("exhibitor_profile_id");
create index if not exists "idx_connection_buyer_profile_id" on "public"."connection" ("buyer_profile_id");
create index if not exists "idx_connection_status" on "public"."connection" ("status");

create index if not exists "idx_rfi_legacy_base44_id" on "public"."rfi" ("legacy_base44_id");
create index if not exists "idx_rfi_connection_id" on "public"."rfi" ("connection_id");
create index if not exists "idx_rfi_buyer_user_id" on "public"."rfi" ("buyer_user_id");
create index if not exists "idx_rfi_exhibitor_user_id" on "public"."rfi" ("exhibitor_user_id");
create index if not exists "idx_rfi_status" on "public"."rfi" ("status");

create index if not exists "idx_meeting_legacy_base44_id" on "public"."meeting" ("legacy_base44_id");
create index if not exists "idx_meeting_connection_id" on "public"."meeting" ("connection_id");
create index if not exists "idx_meeting_proposed_by" on "public"."meeting" ("proposed_by");
create index if not exists "idx_meeting_proposed_to" on "public"."meeting" ("proposed_to");
create index if not exists "idx_meeting_status" on "public"."meeting" ("status");

create index if not exists "idx_meeting_request_legacy_base44_id" on "public"."meeting_request" ("legacy_base44_id");
create index if not exists "idx_meeting_request_requested_by_user_id" on "public"."meeting_request" ("requested_by_user_id");
create index if not exists "idx_meeting_request_target_exhibitor_user_id" on "public"."meeting_request" ("target_exhibitor_user_id");
create index if not exists "idx_meeting_request_event_id" on "public"."meeting_request" ("event_id");
create index if not exists "idx_meeting_request_booth_id" on "public"."meeting_request" ("booth_id");
create index if not exists "idx_meeting_request_meeting_id" on "public"."meeting_request" ("meeting_id");

create index if not exists "idx_media_legacy_base44_id" on "public"."media" ("legacy_base44_id");
create index if not exists "idx_media_connection_id" on "public"."media" ("connection_id");
create index if not exists "idx_media_uploaded_by" on "public"."media" ("uploaded_by");

create index if not exists "idx_saved_booth_legacy_base44_id" on "public"."saved_booth" ("legacy_base44_id");
create index if not exists "idx_saved_booth_buyer_id" on "public"."saved_booth" ("buyer_id");
create index if not exists "idx_saved_booth_exhibitor_user_id" on "public"."saved_booth" ("exhibitor_user_id");
create index if not exists "idx_saved_booth_exhibitor_profile_id" on "public"."saved_booth" ("exhibitor_profile_id");
create index if not exists "idx_saved_booth_event_id" on "public"."saved_booth" ("event_id");

create index if not exists "idx_saved_product_legacy_base44_id" on "public"."saved_product" ("legacy_base44_id");
create index if not exists "idx_saved_product_buyer_id" on "public"."saved_product" ("buyer_id");
create index if not exists "idx_saved_product_product_id" on "public"."saved_product" ("product_id");
create index if not exists "idx_saved_product_event_id" on "public"."saved_product" ("event_id");
create index if not exists "idx_saved_product_exhibitor_user_id" on "public"."saved_product" ("exhibitor_user_id");

create index if not exists "idx_lead_profile_legacy_base44_id" on "public"."lead_profile" ("legacy_base44_id");
create index if not exists "idx_lead_profile_company_id" on "public"."lead_profile" ("company_id");
create index if not exists "idx_lead_profile_source_event_id" on "public"."lead_profile" ("source_event_id");
create index if not exists "idx_lead_profile_source_booth_id" on "public"."lead_profile" ("source_booth_id");
create index if not exists "idx_lead_profile_representative_user_id" on "public"."lead_profile" ("representative_user_id");
create index if not exists "idx_lead_profile_buyer_user_id" on "public"."lead_profile" ("buyer_user_id");

create index if not exists "idx_lead_intelligence_legacy_base44_id" on "public"."lead_intelligence" ("legacy_base44_id");
create index if not exists "idx_lead_intelligence_lead_profile_id" on "public"."lead_intelligence" ("lead_profile_id");
create index if not exists "idx_lead_intelligence_buyer_user_id" on "public"."lead_intelligence" ("buyer_user_id");
create index if not exists "idx_lead_intelligence_exhibitor_user_id" on "public"."lead_intelligence" ("exhibitor_user_id");
create index if not exists "idx_lead_intelligence_company_id" on "public"."lead_intelligence" ("company_id");
create index if not exists "idx_lead_intelligence_event_id" on "public"."lead_intelligence" ("event_id");

create index if not exists "idx_lead_interaction_legacy_base44_id" on "public"."lead_interaction" ("legacy_base44_id");
create index if not exists "idx_lead_interaction_buyer_user_id" on "public"."lead_interaction" ("buyer_user_id");
create index if not exists "idx_lead_interaction_exhibitor_user_id" on "public"."lead_interaction" ("exhibitor_user_id");

create index if not exists "idx_activity_legacy_base44_id" on "public"."activity" ("legacy_base44_id");
create index if not exists "idx_activity_user_id" on "public"."activity" ("user_id");
create index if not exists "idx_activity_target_user_id" on "public"."activity" ("target_user_id");
create index if not exists "idx_activity_company_id" on "public"."activity" ("company_id");
create index if not exists "idx_activity_event_id" on "public"."activity" ("event_id");
create index if not exists "idx_activity_booth_id" on "public"."activity" ("booth_id");
create index if not exists "idx_activity_product_id" on "public"."activity" ("product_id");
create index if not exists "idx_activity_lead_id" on "public"."activity" ("lead_id");
create index if not exists "idx_activity_meeting_id" on "public"."activity" ("meeting_id");
create index if not exists "idx_activity_rfi_id" on "public"."activity" ("rfi_id");

create index if not exists "idx_notification_legacy_base44_id" on "public"."notification" ("legacy_base44_id");
create index if not exists "idx_notification_user_id" on "public"."notification" ("user_id");
create index if not exists "idx_notification_related_id" on "public"."notification" ("related_id");
create index if not exists "idx_notification_read" on "public"."notification" ("read");

create index if not exists "idx_sourcing_project_legacy_base44_id" on "public"."sourcing_project" ("legacy_base44_id");
create index if not exists "idx_sourcing_project_buyer_id" on "public"."sourcing_project" ("buyer_id");

create index if not exists "idx_project_supplier_mapping_legacy_base44_id" on "public"."project_supplier_mapping" ("legacy_base44_id");
create index if not exists "idx_project_supplier_mapping_project_id" on "public"."project_supplier_mapping" ("project_id");
create index if not exists "idx_project_supplier_mapping_buyer_id" on "public"."project_supplier_mapping" ("buyer_id");
create index if not exists "idx_project_supplier_mapping_exhibitor_user_id" on "public"."project_supplier_mapping" ("exhibitor_user_id");
create index if not exists "idx_project_supplier_mapping_exhibitor_profile_id" on "public"."project_supplier_mapping" ("exhibitor_profile_id");

create index if not exists "idx_match_recommendation_legacy_base44_id" on "public"."match_recommendation" ("legacy_base44_id");
create index if not exists "idx_match_recommendation_buyer_user_id" on "public"."match_recommendation" ("buyer_user_id");
create index if not exists "idx_match_recommendation_buyer_company_id" on "public"."match_recommendation" ("buyer_company_id");
create index if not exists "idx_match_recommendation_recommended_exhibitor_user_id" on "public"."match_recommendation" ("recommended_exhibitor_user_id");
create index if not exists "idx_match_recommendation_recommended_company_id" on "public"."match_recommendation" ("recommended_company_id");
create index if not exists "idx_match_recommendation_recommended_product_id" on "public"."match_recommendation" ("recommended_product_id");
create index if not exists "idx_match_recommendation_recommended_event_id" on "public"."match_recommendation" ("recommended_event_id");
create index if not exists "idx_match_recommendation_recommended_booth_id" on "public"."match_recommendation" ("recommended_booth_id");

create index if not exists "idx_opportunity_post_legacy_base44_id" on "public"."opportunity_post" ("legacy_base44_id");
create index if not exists "idx_opportunity_post_posted_by_user_id" on "public"."opportunity_post" ("posted_by_user_id");

create index if not exists "idx_integration_connection_legacy_base44_id" on "public"."integration_connection" ("legacy_base44_id");
create index if not exists "idx_integration_connection_user_id" on "public"."integration_connection" ("user_id");
create index if not exists "idx_integration_connection_provider" on "public"."integration_connection" ("provider");

create index if not exists "idx_integration_sync_log_legacy_base44_id" on "public"."integration_sync_log" ("legacy_base44_id");
create index if not exists "idx_integration_sync_log_connection_id" on "public"."integration_sync_log" ("connection_id");
create index if not exists "idx_integration_sync_log_user_id" on "public"."integration_sync_log" ("user_id");

create unique index if not exists "idx_nfc_profile_nfc_identifier_unique" on "public"."nfc_profile" ("nfc_identifier") where "nfc_identifier" is not null;
create index if not exists "idx_nfc_profile_legacy_base44_id" on "public"."nfc_profile" ("legacy_base44_id");
create index if not exists "idx_nfc_profile_user_id" on "public"."nfc_profile" ("user_id");
create index if not exists "idx_nfc_profile_event_id" on "public"."nfc_profile" ("event_id");

create index if not exists "idx_nfc_interaction_legacy_base44_id" on "public"."nfc_interaction" ("legacy_base44_id");
create index if not exists "idx_nfc_interaction_initiator_user_id" on "public"."nfc_interaction" ("initiator_user_id");
create index if not exists "idx_nfc_interaction_target_user_id" on "public"."nfc_interaction" ("target_user_id");
create index if not exists "idx_nfc_interaction_event_id" on "public"."nfc_interaction" ("event_id");
create index if not exists "idx_nfc_interaction_nfc_identifier" on "public"."nfc_interaction" ("nfc_identifier");

create unique index if not exists "idx_nfc_product_tag_tag_code_unique" on "public"."nfc_product_tag" ("tag_code") where "tag_code" is not null;
create index if not exists "idx_nfc_product_tag_legacy_base44_id" on "public"."nfc_product_tag" ("legacy_base44_id");
create index if not exists "idx_nfc_product_tag_product_id" on "public"."nfc_product_tag" ("product_id");
create index if not exists "idx_nfc_product_tag_supplier_user_id" on "public"."nfc_product_tag" ("supplier_user_id");
create index if not exists "idx_nfc_product_tag_event_id" on "public"."nfc_product_tag" ("event_id");

create index if not exists "idx_scanned_contact_legacy_base44_id" on "public"."scanned_contact" ("legacy_base44_id");
create index if not exists "idx_scanned_contact_scanned_by_user_id" on "public"."scanned_contact" ("scanned_by_user_id");
create index if not exists "idx_scanned_contact_event_id" on "public"."scanned_contact" ("event_id");
create index if not exists "idx_scanned_contact_linked_lead_id" on "public"."scanned_contact" ("linked_lead_id");
create index if not exists "idx_scanned_contact_linked_project_id" on "public"."scanned_contact" ("linked_project_id");

create index if not exists "idx_billing_subscription_legacy_base44_id" on "public"."billing_subscription" ("legacy_base44_id");
create index if not exists "idx_billing_subscription_user_id" on "public"."billing_subscription" ("user_id");
create index if not exists "idx_billing_subscription_provider_subscription_id" on "public"."billing_subscription" ("provider_subscription_id");

create index if not exists "idx_billing_transaction_legacy_base44_id" on "public"."billing_transaction" ("legacy_base44_id");
create index if not exists "idx_billing_transaction_user_id" on "public"."billing_transaction" ("user_id");
create index if not exists "idx_billing_transaction_subscription_id" on "public"."billing_transaction" ("subscription_id");
create index if not exists "idx_billing_transaction_provider_transaction_id" on "public"."billing_transaction" ("provider_transaction_id");

create index if not exists "idx_premium_booth_subscription_legacy_base44_id" on "public"."premium_booth_subscription" ("legacy_base44_id");
create index if not exists "idx_premium_booth_subscription_exhibitor_id" on "public"."premium_booth_subscription" ("exhibitor_id");

create index if not exists "idx_sponsored_listing_legacy_base44_id" on "public"."sponsored_listing" ("legacy_base44_id");
create index if not exists "idx_sponsored_listing_exhibitor_user_id" on "public"."sponsored_listing" ("exhibitor_user_id");
create index if not exists "idx_sponsored_listing_event_id" on "public"."sponsored_listing" ("event_id");

create unique index if not exists "idx_support_ticket_ticket_number_unique" on "public"."support_ticket" ("ticket_number") where "ticket_number" is not null;
create index if not exists "idx_support_ticket_legacy_base44_id" on "public"."support_ticket" ("legacy_base44_id");
create index if not exists "idx_support_ticket_created_by" on "public"."support_ticket" ("created_by");
create index if not exists "idx_support_ticket_assigned_to" on "public"."support_ticket" ("assigned_to");
create index if not exists "idx_support_ticket_event_id" on "public"."support_ticket" ("event_id");

create index if not exists "idx_admin_access_log_legacy_base44_id" on "public"."admin_access_log" ("legacy_base44_id");
create index if not exists "idx_admin_access_log_admin_id" on "public"."admin_access_log" ("admin_id");
create index if not exists "idx_admin_access_log_email" on "public"."admin_access_log" ("email");

create index if not exists "idx_system_alert_legacy_base44_id" on "public"."system_alert" ("legacy_base44_id");
create index if not exists "idx_system_alert_status" on "public"."system_alert" ("status");
create index if not exists "idx_system_alert_severity" on "public"."system_alert" ("severity");

create index if not exists "idx_stress_test_result_legacy_base44_id" on "public"."stress_test_result" ("legacy_base44_id");
