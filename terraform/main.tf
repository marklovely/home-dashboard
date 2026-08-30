locals {
  managed_sites = {
    for site_id, site in var.sites : site_id => site if site.terraform
  }

  hub_zone_ids = merge(
    { (var.zone_name) = var.cloudflare_zone_id },
    var.customer_cloudflare_zone_id != "" ? { (var.customer_zone_name) = var.customer_cloudflare_zone_id } : {}
  )

  # optional(string) zone_name is null when unset — lookup() would return null instead of the default.
  site_zone_names = {
    for site_id, site in local.managed_sites : site_id => coalesce(site.zone_name, var.zone_name)
  }

  # Global owners on every hub; tester_emails (and legacy site owner_emails) add site-only access.
  site_owner_emails = {
    for site_id, site in local.managed_sites : site_id => distinct(concat(
      var.owner_emails,
      coalesce(site.tester_emails, []),
      coalesce(site.owner_emails, []),
    ))
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
  zone_id                  = local.hub_zone_ids[local.site_zone_names[each.key]]
  zone_name                = local.site_zone_names[each.key]
  workers_subdomain        = var.workers_subdomain
  access_team_domain       = var.access_team_domain
  owner_emails             = local.site_owner_emails[each.key]
  sitter_emails            = coalesce(try(each.value.sitter_emails, null), var.sitter_emails)
  github_owner             = var.github_owner
  github_repo              = var.github_repo
  github_production_branch = var.github_production_branch
  # null → module generates random_password (sandbox). Explicit value for imports (production/test).
  hub_proxy_secret                      = lookup(var.hub_proxy_secrets, each.key, try(each.value.hub_proxy_secret, null))
  attach_hub_api_binding                = each.value.attach_hub_api_binding
  include_pages_dev_access_destinations = lookup(each.value, "include_pages_dev_access_destinations", true)
  access_enabled                        = lookup(each.value, "access_enabled", true)
  platform_health_checks_enabled        = var.platform_admin.enabled
}

module "platform_admin" {
  count  = var.platform_admin.enabled ? 1 : 0
  source = "./modules/platform_admin"

  account_id                        = var.cloudflare_account_id
  zone_id                           = var.cloudflare_zone_id
  zone_name                         = var.zone_name
  hostname                          = var.platform_admin.hostname
  pages_name                        = var.platform_admin.pages_name
  access_team_domain                = var.access_team_domain
  operator_emails                   = var.platform_operator_emails
  github_owner                      = var.github_owner
  github_repo                       = var.github_repo
  github_production_branch          = var.github_production_branch
  platform_github_token             = var.platform_github_token
  platform_cf_api_token             = var.platform_cf_api_token
  stripe_secret_key                 = var.stripe_secret_key
  stripe_webhook_secret             = var.stripe_webhook_secret
  stripe_price_id                   = var.stripe_price_id
  stripe_price_id_yearly            = var.stripe_price_id_yearly
  marketing_site_origin             = var.marketing_site_origin
  public_signup_enabled             = var.public_signup_enabled
  pages_preview_deployments_enabled = var.pages_preview_deployments_enabled
}
