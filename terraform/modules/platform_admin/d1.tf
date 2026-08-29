resource "cloudflare_d1_database" "platform_billing" {
  account_id = var.account_id
  name       = "lovely-home-platform-billing"

  read_replication = {
    mode = "disabled"
  }
}
