variable "account_id" {
  type = string
}

variable "zone_id" {
  type = string
}

variable "zone_name" {
  type = string
}

variable "hostname" {
  type        = string
  description = "Custom domain for the platform admin UI (e.g. platform.lovely-home.co.uk)."
}

variable "pages_name" {
  type        = string
  default     = "home-dashboard-platform"
  description = "Cloudflare Pages project name."
}

variable "access_team_domain" {
  type = string
}

variable "operator_emails" {
  type        = list(string)
  description = "Mark-only operator emails for Cloudflare Access and PLATFORM_OPERATOR_EMAILS."
}

variable "github_owner" {
  type = string
}

variable "github_repo" {
  type = string
}

variable "github_production_branch" {
  type = string
}

variable "access_session_duration" {
  type    = string
  default = "720h"
}

variable "platform_github_token" {
  type        = string
  default     = ""
  sensitive   = true
  description = "GitHub PAT for site wizard (contents:write, actions:write). Omit to disable automation UI."
}

variable "platform_cf_api_token" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Cloudflare API token with Account Read, D1 Read, and R2 Read for platform storage usage checks."
}

variable "stripe_secret_key" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Stripe secret API key (sk_test_… or sk_live_…). Omit until billing is enabled."
}

variable "stripe_webhook_secret" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Stripe webhook signing secret (whsec_…)."
}

variable "stripe_price_id" {
  type        = string
  default     = ""
  description = "Stripe Price id for the monthly hub subscription (price_…, e.g. £9.99/month)."
}

variable "stripe_price_id_yearly" {
  type        = string
  default     = ""
  description = "Stripe Price id for the yearly hub subscription (price_…, e.g. £99/year)."
}

variable "stripe_checkout_success_url" {
  type        = string
  default     = ""
  description = "Optional Checkout success URL. Defaults to platform hostname + /?billing=success."
}

variable "stripe_checkout_cancel_url" {
  type        = string
  default     = ""
  description = "Optional Checkout cancel URL. Defaults to platform hostname + /?billing=cancel."
}

variable "marketing_site_origin" {
  type        = string
  default     = "https://lovely-home.co.uk"
  description = "Public marketing site origin (no trailing slash). Used for PUBLIC_SIGNUP CORS and Checkout return URLs."
}

variable "public_signup_enabled" {
  type        = bool
  default     = false
  description = "When true, sets PUBLIC_SIGNUP_ENABLED on platform Pages (requires Stripe + PLATFORM_GITHUB_TOKEN)."
}

variable "pages_preview_deployments_enabled" {
  type        = bool
  default     = true
  description = "When true, non-production branches get Cloudflare Pages preview builds with the same env vars as production."
}

variable "pages_dev_hostname" {
  type        = string
  default     = null
  description = "Override Cloudflare-assigned *.pages.dev hostname when it differs from the Pages project name."
}

locals {
  hostname_label = replace(var.hostname, ".${var.zone_name}", "")
  pages_dev_host = coalesce(var.pages_dev_hostname, "${var.pages_name}.pages.dev")
  operator_policy_includes = [
    for email in var.operator_emails : {
      email = { email = email }
    }
  ]
  operator_emails_csv = join(",", var.operator_emails)
  github_repo_slug    = "${var.github_owner}/${var.github_repo}"
}
