output "cloudflare_account_id" {
  description = "Cloudflare account ID (for platform admin dashboard links)."
  value       = var.cloudflare_account_id
}

output "access_team_domain" {
  description = "Zero Trust team slug (for platform admin dashboard links)."
  value       = var.access_team_domain
}

output "zone_name" {
  description = "DNS zone name."
  value       = var.zone_name
}

output "sites" {
  description = "Provisioned hub sites (JSON contract for scripts and future platform admin)."
  value = {
    for site_id, site in module.hub_site : site_id => site.site_contract
  }
}

output "hub_proxy_secrets" {
  description = "Generated HUB_PROXY_SECRET per site — set on Worker and Pages (sensitive)."
  value = {
    for site_id, site in module.hub_site : site_id => site.hub_proxy_secret
  }
  sensitive = true
}

output "platform_admin" {
  description = "Platform operator dashboard (when platform_admin.enabled)."
  value       = length(module.platform_admin) > 0 ? module.platform_admin[0].platform_contract : null
}

output "marketing_site" {
  description = "Marketing site Access (when marketing_site_access_protected)."
  value       = length(module.marketing_site) > 0 ? module.marketing_site[0].marketing_site_contract : null
}
