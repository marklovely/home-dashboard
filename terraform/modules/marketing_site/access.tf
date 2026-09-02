# Pre-launch gate for the static marketing site (lovely-home.co.uk).
# Does not affect platform.lovely-home.co.uk — public signup API bypass stays on the platform Access app.
resource "cloudflare_zero_trust_access_application" "marketing_site" {
  account_id       = var.account_id
  name             = "Lovely Home — Marketing site"
  type             = "self_hosted"
  domain           = var.hostname
  session_duration = var.access_session_duration

  destinations = concat(
    [{
      type = "public"
      uri  = var.hostname
    }],
    var.include_www ? [{
      type = "public"
      uri  = local.www_hostname
    }] : [],
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

  # Dashboard-managed preview guests are extra emails on this policy.
  # Ignore drift so terraform apply does not wipe them.
  lifecycle {
    ignore_changes = [policies]
  }
}

# Public page shown when Access denies a login (and as a fallback if someone
# lands here after a missing OTP). Must bypass the marketing-site Access app.
# Pages 308s *.html to the extensionless path on the custom domain.
resource "cloudflare_zero_trust_access_application" "access_unauthorised" {
  account_id       = var.account_id
  name             = "Lovely Home — Access unauthorised page"
  type             = "self_hosted"
  domain           = "${var.hostname}/access-unauthorised"
  session_duration = var.access_session_duration

  destinations = concat(
    [
      {
        type = "public"
        uri  = "${var.hostname}/access-unauthorised"
      },
      {
        type = "public"
        uri  = "${var.hostname}/access-unauthorised.html"
      }
    ],
    var.include_www ? [
      {
        type = "public"
        uri  = "${local.www_hostname}/access-unauthorised"
      },
      {
        type = "public"
        uri  = "${local.www_hostname}/access-unauthorised.html"
      }
    ] : []
  )

  policies = [{
    name       = "Bypass access unauthorised page"
    decision   = "bypass"
    precedence = 1
    include = [{
      everyone = {}
    }]
  }]
}
