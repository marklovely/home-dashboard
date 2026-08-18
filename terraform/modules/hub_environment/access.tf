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
}

resource "cloudflare_zero_trust_access_application" "pages" {
  account_id       = var.account_id
  name             = "Lovely Home — ${var.site_id} Pages"
  type             = "self_hosted"
  domain           = var.hostname
  session_duration = var.access_session_duration

  destinations = [{
    type = "public"
    uri  = var.hostname
  }]

  policies = local.access_policies
}

resource "cloudflare_zero_trust_access_application" "worker" {
  account_id       = var.account_id
  name             = "Lovely Home — ${var.site_id} Worker"
  type             = "self_hosted"
  domain           = local.worker_hostname
  session_duration = var.access_session_duration

  destinations = [{
    type = "public"
    uri  = local.worker_hostname
  }]

  policies = local.access_policies
}
