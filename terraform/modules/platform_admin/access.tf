resource "cloudflare_zero_trust_access_application" "platform" {
  account_id       = var.account_id
  name             = "Lovely Home — Platform admin"
  type             = "self_hosted"
  domain           = var.hostname
  session_duration = var.access_session_duration

  destinations = [{
    type = "public"
    uri  = var.hostname
  }]

  policies = length(var.operator_emails) > 0 ? [{
    name       = "Platform operators"
    decision   = "allow"
    precedence = 1
    include    = local.operator_policy_includes
  }] : []
}
