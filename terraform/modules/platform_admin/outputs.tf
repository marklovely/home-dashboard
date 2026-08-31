output "platform_contract" {
  description = "Platform admin UI contract for scripts and operator docs."
  value = {
    hostname              = var.hostname
    pages_project         = var.pages_name
    pages_url             = "https://${var.hostname}"
    access_pages_aud      = cloudflare_zero_trust_access_application.platform.aud
    cf_access_team_domain = var.access_team_domain
    operator_emails       = var.operator_emails
    platform_billing_d1 = {
      database_name = cloudflare_d1_database.platform_billing.name
      database_id   = cloudflare_d1_database.platform_billing.id
      binding       = "PLATFORM_BILLING_DB"
    }
    archive_r2_bucket = cloudflare_r2_bucket.archives.name
  }
}
