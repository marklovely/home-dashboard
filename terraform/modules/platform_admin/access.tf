resource "cloudflare_zero_trust_access_application" "platform" {
  account_id       = var.account_id
  name             = "Lovely Home — Platform admin"
  type             = "self_hosted"
  domain           = var.hostname
  session_duration = var.access_session_duration

  destinations = concat(
    [{
      type = "public"
      uri  = var.hostname
    }],
    var.pages_preview_deployments_enabled ? [
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

  policies = length(var.operator_emails) > 0 ? [{
    name       = "Platform operators"
    decision   = "allow"
    precedence = 1
    include    = local.operator_policy_includes
  }] : []
}

# Public signup API is called cross-origin from lovely-home.co.uk — bypass Access at Zero Trust.
resource "cloudflare_zero_trust_access_application" "platform_public_signup" {
  count            = var.public_signup_enabled ? 1 : 0
  account_id       = var.account_id
  name             = "Lovely Home — Platform public signup API"
  type             = "self_hosted"
  domain           = "${var.hostname}/api/public"
  session_duration = var.access_session_duration

  destinations = [{
    type = "public"
    uri  = "${var.hostname}/api/public"
  }]

  policies = [{
    name       = "Bypass public signup API"
    decision   = "bypass"
    precedence = 1
    include = [{
      everyone = {}
    }]
  }]
}

# Stripe webhooks cannot complete Cloudflare Access OTP — bypass at Zero Trust (not Pages middleware only).
resource "cloudflare_zero_trust_access_application" "platform_stripe_webhook" {
  account_id       = var.account_id
  name             = "Lovely Home — Platform Stripe webhook"
  type             = "self_hosted"
  domain           = "${var.hostname}/api/stripe/webhook"
  session_duration = var.access_session_duration

  destinations = [{
    type = "public"
    uri  = "${var.hostname}/api/stripe/webhook"
  }]

  policies = [{
    name       = "Bypass Stripe webhooks"
    decision   = "bypass"
    precedence = 1
    include = [{
      everyone = {}
    }]
  }]
}

# Public signup API (lovely-home.co.uk → platform) cannot complete Access login — bypass at Zero Trust.
resource "cloudflare_zero_trust_access_application" "platform_public_api" {
  count = var.public_signup_enabled ? 1 : 0

  account_id       = var.account_id
  name             = "Lovely Home — Platform public signup API"
  type             = "self_hosted"
  domain           = "${var.hostname}/api/public"
  session_duration = var.access_session_duration

  destinations = [{
    type = "public"
    uri  = "${var.hostname}/api/public"
  }]

  policies = [{
    name       = "Bypass public signup API"
    decision   = "bypass"
    precedence = 1
    include = [{
      everyone = {}
    }]
  }]
}
