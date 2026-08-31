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
}
