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
