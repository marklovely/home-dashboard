locals {
  managed_sites = {
    for site_id, site in var.sites : site_id => site if site.terraform
  }
}

module "hub_site" {
  for_each = local.managed_sites

  source = "./modules/hub_environment"

  site_id                  = each.key
  hub_environment          = each.value.hub_environment
  hostname                 = each.value.hostname
  vanilla                  = each.value.vanilla
  account_id               = var.cloudflare_account_id
  zone_id                  = var.cloudflare_zone_id
  zone_name                = var.zone_name
  workers_subdomain        = var.workers_subdomain
  access_team_domain       = var.access_team_domain
  owner_emails             = coalesce(try(each.value.owner_emails, null), var.owner_emails)
  sitter_emails            = coalesce(try(each.value.sitter_emails, null), var.sitter_emails)
  github_owner             = var.github_owner
  github_repo              = var.github_repo
  github_production_branch = var.github_production_branch
  # null → module generates random_password (sandbox). Explicit value for imports (production/test).
  hub_proxy_secret               = lookup(var.hub_proxy_secrets, each.key, try(each.value.hub_proxy_secret, null))
  attach_hub_api_binding         = each.value.attach_hub_api_binding
  platform_health_checks_enabled = var.platform_admin.enabled
}

module "platform_admin" {
  count  = var.platform_admin.enabled ? 1 : 0
  source = "./modules/platform_admin"

  account_id               = var.cloudflare_account_id
  zone_id                  = var.cloudflare_zone_id
  zone_name                = var.zone_name
  hostname                 = var.platform_admin.hostname
  pages_name               = var.platform_admin.pages_name
  access_team_domain       = var.access_team_domain
  operator_emails          = var.platform_operator_emails
  github_owner             = var.github_owner
  github_repo              = var.github_repo
  github_production_branch = var.github_production_branch
  platform_github_token    = var.platform_github_token
}
