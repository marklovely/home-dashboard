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

  access_policies = concat(
    length(var.owner_emails) > 0 ? [{
      name       = "Owners"
      decision   = "allow"
      precedence = 1
      include    = local.owner_policy_includes
    }] : [],
    length(var.sitter_emails) > 0 ? [{
      name       = "House sitters"
      decision   = "allow"
      precedence = 2
      include    = local.sitter_policy_includes
    }] : [],
    var.platform_health_service_token_id != null ? [{
      name       = "Platform health checks"
      decision   = "allow"
      precedence = 10
      include = [{
        service_token = {
          token_id = var.platform_health_service_token_id
        }
      }]
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
