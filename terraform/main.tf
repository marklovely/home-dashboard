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

  # Hubs outside the platform zone belong to customers. They must not inherit the
  # platform-wide owner list, or every household would share one Access policy.
  customer_hubs = {
    for site_id, site in local.managed_sites : site_id => coalesce(
      site.customer_hub,
      local.site_zone_names[site_id] != var.zone_name
    )
  }

  # Platform sites get the global owner list; customer hubs get only the named
  # support identities plus their own owners.
  site_owner_emails = {
    for site_id, site in local.managed_sites : site_id => distinct(concat(
      local.customer_hubs[site_id] ? var.support_owner_emails : var.owner_emails,
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

module "marketing_site" {
  count  = var.marketing_site_access_protected ? 1 : 0
  source = "./modules/marketing_site"

  account_id                        = var.cloudflare_account_id
  hostname                          = var.zone_name
  pages_name                        = var.marketing_site_pages_name
  operator_emails                   = var.platform_operator_emails
  pages_preview_deployments_enabled = var.pages_preview_deployments_enabled
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
  stripe_secret_key_live            = var.stripe_secret_key_live
  stripe_webhook_secret_live        = var.stripe_webhook_secret_live
  stripe_price_id_live              = var.stripe_price_id_live
  stripe_price_id_yearly_live       = var.stripe_price_id_yearly_live
  marketing_site_origin             = var.marketing_site_origin
  marketing_access_app_id           = try(module.marketing_site[0].marketing_site_contract.access_app_id, "")
  public_signup_enabled             = var.public_signup_enabled
  turnstile_site_key                = var.turnstile_site_key
  turnstile_secret_key              = var.turnstile_secret_key
  resend_api_key                    = var.resend_api_key
  customer_email_from               = var.customer_email_from
  pages_preview_deployments_enabled = var.pages_preview_deployments_enabled
}
