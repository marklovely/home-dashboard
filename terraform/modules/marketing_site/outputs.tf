output "marketing_site_contract" {
  description = "Marketing site Access contract for operator docs."
  value = {
    hostname         = var.hostname
    pages_project    = var.pages_name
    pages_url        = "https://${var.hostname}"
    access_pages_aud = cloudflare_zero_trust_access_application.marketing_site.aud
    access_app_id    = cloudflare_zero_trust_access_application.marketing_site.id
    operator_emails  = var.operator_emails
  }
}
