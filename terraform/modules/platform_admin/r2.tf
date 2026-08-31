resource "cloudflare_r2_bucket" "archives" {
  account_id = var.account_id
  name       = "lovely-home-hub-archives"
}
