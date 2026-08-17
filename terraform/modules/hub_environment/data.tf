resource "cloudflare_d1_database" "manuals" {
  account_id = var.account_id
  name       = local.d1_name

  read_replication = {
    mode = "disabled"
  }
}

resource "cloudflare_r2_bucket" "guides" {
  account_id = var.account_id
  name       = local.r2_guides_name
}

resource "cloudflare_r2_bucket" "media" {
  account_id = var.account_id
  name       = local.r2_media_name
}

resource "random_password" "hub_proxy" {
  length  = 48
  special = false
}
