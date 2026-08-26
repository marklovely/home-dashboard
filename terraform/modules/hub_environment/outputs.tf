output "site_contract" {
  description = "Stable JSON contract for scripts and future platform admin."
  value = {
    site_id               = var.site_id
    hub_environment       = var.hub_environment
    hostname              = var.hostname
    vanilla               = var.vanilla
    access_enabled        = var.access_enabled
    worker_name           = local.worker_name
    worker_hostname       = local.worker_hostname
    worker_api_origin     = local.worker_api_origin
    pages_project         = local.pages_name
    pages_url             = "https://${var.hostname}"
    d1_database_name      = local.d1_name
    d1_database_id        = cloudflare_d1_database.manuals.id
    r2_guides_bucket      = local.r2_guides_name
    r2_media_bucket       = local.r2_media_name
    access_pages_aud      = var.access_enabled ? cloudflare_zero_trust_access_application.pages[0].aud : ""
    access_worker_aud     = var.access_enabled ? cloudflare_zero_trust_access_application.worker[0].aud : ""
    access_aud_combined   = var.access_enabled ? "${cloudflare_zero_trust_access_application.worker[0].aud},${cloudflare_zero_trust_access_application.pages[0].aud}" : ""
    cf_access_team_domain = var.access_team_domain
    owner_emails          = var.owner_emails
    sitter_emails         = var.sitter_emails
    access_pages_app_id   = var.access_enabled ? cloudflare_zero_trust_access_application.pages[0].id : ""
    access_worker_app_id  = var.access_enabled ? cloudflare_zero_trust_access_application.worker[0].id : ""
    default_latitude      = var.default_latitude
    default_longitude     = var.default_longitude
  }
}

output "hub_proxy_secret" {
  value     = local.hub_proxy_secret_value
  sensitive = true
}
