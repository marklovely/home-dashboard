locals {
  owner_policy_includes = [
    for email in var.owner_emails : {
      email = { email = email }
    }
  ]

  sitter_policy_includes = [
    for email in var.sitter_emails : {
      email = { email = email }
    }
  ]

  # List policies in precedence order (1, 2, 3…) so Terraform state matches Cloudflare API order.
  access_policies = concat(
    var.platform_health_checks_enabled ? [{
      name       = "Platform health checks"
      decision   = "non_identity"
      precedence = 1
      include = [{
        any_valid_service_token = {}
      }]
    }] : [],
    length(var.owner_emails) > 0 ? [{
      name       = "Owners"
      decision   = "allow"
      precedence = var.platform_health_checks_enabled ? 2 : 1
      include    = local.owner_policy_includes
    }] : [],
    length(var.sitter_emails) > 0 ? [{
      name       = "House sitters"
      decision   = "allow"
      precedence = var.platform_health_checks_enabled ? 3 : 2
      include    = local.sitter_policy_includes
    }] : []
  )

  # Keep in sync with accessLoginAppName() in src/lib/hubHomeName.js
  access_generic_home_names = {
    production = "Lovely Home"
    sandbox    = "Sandbox Home"
    test       = "Test Home"
    demo       = "Demo Home"
    dev        = "Dev Home"
  }
  access_site_title = join(" ", [for part in split("-", var.site_id) : title(part)])
  access_home_name = lookup(
    local.access_generic_home_names,
    var.site_id,
    endswith(lower(local.access_site_title), " home") ? local.access_site_title : "${local.access_site_title} Home"
  )
  access_login_logo_url       = "https://raw.githubusercontent.com/marklovely/home-dashboard/main/website/favicon.png"
  access_unauthorised_url     = "https://lovely-home.co.uk/access-unauthorised.html"
  access_unauthorised_message = "You are not authorised to access this home. If you did not receive a login code, this email is not on the household list."
}

resource "cloudflare_zero_trust_access_application" "pages" {
  count = var.access_enabled ? 1 : 0

  account_id                   = var.account_id
  name                         = local.access_home_name
  logo_url                     = local.access_login_logo_url
  type                         = "self_hosted"
  domain                       = var.hostname
  session_duration             = var.access_session_duration
  custom_deny_url              = local.access_unauthorised_url
  custom_deny_message          = local.access_unauthorised_message
  custom_non_identity_deny_url = local.access_unauthorised_url

  # Custom domain + default Pages hostname + PR preview hostnames share one AUD
  # (CF_ACCESS_AUD_PAGES). Without *.pages.dev, preview builds show "invalid redirect URL".
  # New sites start with the custom domain only (see include_pages_dev_access_destinations).
  destinations = concat(
    [{
      type = "public"
      uri  = var.hostname
    }],
    var.include_pages_dev_access_destinations ? [
      {
        type = "public"
        uri  = local.pages_dev_host
      },
      {
        type = "public"
        uri  = "*.${local.pages_dev_host}"
      }
    ] : []
  )

  policies = local.access_policies
}

resource "cloudflare_zero_trust_access_application" "worker" {
  count = var.access_enabled ? 1 : 0

  account_id                   = var.account_id
  name                         = "${local.access_home_name} API"
  logo_url                     = local.access_login_logo_url
  type                         = "self_hosted"
  domain                       = local.worker_hostname
  session_duration             = var.access_session_duration
  custom_deny_url              = local.access_unauthorised_url
  custom_deny_message          = local.access_unauthorised_message
  custom_non_identity_deny_url = local.access_unauthorised_url

  destinations = [{
    type = "public"
    uri  = local.worker_hostname
  }]

  policies = local.access_policies
}
