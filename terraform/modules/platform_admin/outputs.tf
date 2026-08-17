output "platform_contract" {
  description = "Platform admin UI contract for scripts and operator docs."
  value = {
    hostname              = var.hostname
    pages_project         = var.pages_name
    pages_url             = "https://${var.hostname}"
    access_pages_aud      = cloudflare_zero_trust_access_application.platform.aud
    cf_access_team_domain = var.access_team_domain
    operator_emails       = var.operator_emails
    health_service_token_id = cloudflare_zero_trust_access_service_token.platform_health.id
  }
}

output "health_service_token_id" {
  description = "Access service token ID allowed on hub sites for platform health probes."
  value       = cloudflare_zero_trust_access_service_token.platform_health.id
}
