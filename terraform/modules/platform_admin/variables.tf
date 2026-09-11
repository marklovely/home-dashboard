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
  description = "Cloudflare API token with Account Read, D1 Read, R2 Read, Pages Edit, and Access Apps and Policies Edit (marketing preview emails + usage + preview toggles)."
}

variable "platform_cf_workers_plan" {
  type        = string
  default     = "paid"
  description = "Cloudflare Workers plan for platform admin usage limits: free or paid."
}

variable "platform_cf_r2_plan" {
  type        = string
  default     = "paid"
  description = "Cloudflare R2 plan for platform admin usage display: free or paid."
}

variable "stripe_secret_key" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Stripe TEST secret API key (sk_test_…). Omit until billing is enabled."
}

variable "stripe_webhook_secret" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Stripe TEST webhook signing secret (whsec_…)."
}

variable "stripe_price_id" {
  type        = string
  default     = ""
  description = "Stripe TEST monthly Price id (price_…)."
}

variable "stripe_price_id_yearly" {
  type        = string
  default     = ""
  description = "Stripe TEST yearly Price id (price_…)."
}

variable "stripe_price_id_free" {
  type        = string
  default     = ""
  description = "Stripe TEST Price id for the free (£0) hub subscription (price_…)."
}

variable "stripe_referral_coupon_monthly" {
  type        = string
  default     = ""
  description = "Stripe TEST Coupon id for monthly referral discount (£5 off × 2 months)."
}

variable "stripe_referral_coupon_yearly" {
  type        = string
  default     = ""
  description = "Stripe TEST Coupon id for yearly referral discount (£15 off first year)."
}

variable "stripe_intro_coupon_monthly" {
  type        = string
  default     = ""
  description = "Stripe TEST Coupon id for monthly introductory offer (25% off × 2 months)."
}

variable "stripe_intro_coupon_yearly" {
  type        = string
  default     = ""
  description = "Stripe TEST Coupon id for yearly introductory offer (30% off first year)."
}

variable "stripe_secret_key_live" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Stripe LIVE secret API key (sk_live_…). Optional until public launch."
}

variable "stripe_webhook_secret_live" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Stripe LIVE webhook signing secret (whsec_…)."
}

variable "stripe_price_id_live" {
  type        = string
  default     = ""
  description = "Stripe LIVE monthly Price id (price_…)."
}

variable "stripe_price_id_yearly_live" {
  type        = string
  default     = ""
  description = "Stripe LIVE yearly Price id (price_…)."
}

variable "stripe_price_id_free_live" {
  type        = string
  default     = ""
  description = "Stripe LIVE Price id for the free (£0) hub subscription (price_…)."
}

variable "stripe_referral_coupon_monthly_live" {
  type        = string
  default     = ""
  description = "Stripe LIVE Coupon id for monthly referral discount."
}

variable "stripe_referral_coupon_yearly_live" {
  type        = string
  default     = ""
  description = "Stripe LIVE Coupon id for yearly referral discount."
}

variable "stripe_intro_coupon_monthly_live" {
  type        = string
  default     = ""
  description = "Stripe LIVE Coupon id for monthly introductory offer."
}

variable "stripe_intro_coupon_yearly_live" {
  type        = string
  default     = ""
  description = "Stripe LIVE Coupon id for yearly introductory offer."
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

variable "marketing_access_app_id" {
  type        = string
  default     = ""
  description = "Cloudflare Access application id for the pre-launch marketing site gate (lovely-home.co.uk)."
}

variable "public_signup_enabled" {
  type        = bool
  default     = false
  description = "When true, sets PUBLIC_SIGNUP_ENABLED on platform Pages (requires Stripe + PLATFORM_GITHUB_TOKEN)."
}

variable "turnstile_site_key" {
  type        = string
  default     = ""
  description = "Cloudflare Turnstile site key for the public signup form. Signup only enforces the challenge when both Turnstile values are set."
}

variable "turnstile_secret_key" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Cloudflare Turnstile secret key used to verify signup tokens server-side."
}

variable "resend_api_key" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Resend API key for customer lifecycle emails."
}

variable "platform_site_archive_secret" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Shared secret for platform → hub Worker calls (archive export, downgrade usage checks). Same value as GitHub PLATFORM_SITE_ARCHIVE_SECRET."
}

variable "customer_email_from" {
  type        = string
  default     = ""
  description = "From header for customer emails. Application default is Lovely Home <support@lovely-home.co.uk>."
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
