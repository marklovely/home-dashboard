resource "cloudflare_zero_trust_access_service_token" "platform_health" {
  account_id = var.account_id
  name       = "Lovely Home — platform health checks"
  duration   = "8760h"
}
