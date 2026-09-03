variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account ID."
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Zone ID for the hub domain (e.g. lovely-home.co.uk)."
}

variable "zone_name" {
  type        = string
  default     = "lovely-home.co.uk"
  description = "DNS zone name (without trailing dot)."
}

variable "terraform_stack" {
  type        = string
  default     = "platform"
  description = "Which remote state this apply uses: platform (admin + lovely-home.co.uk hubs) or customers (lovely-hub.com hubs)."

  validation {
    condition     = contains(["platform", "customers"], var.terraform_stack)
    error_message = "terraform_stack must be \"platform\" or \"customers\"."
  }
}

variable "provision_site_id" {
  type        = string
  default     = ""
  description = "When set on the customers stack, only this hub is in managed_sites. Required for per-site customer state so an apply cannot recreate other households."
}

variable "workers_subdomain" {
  type        = string
  description = "Workers.dev account subdomain (e.g. mark-lovely67 from lovely-home-hub-api.mark-lovely67.workers.dev)."
}

variable "access_team_domain" {
  type        = string
  description = "Zero Trust team slug only (e.g. lovely-home from https://lovely-home.cloudflareaccess.com). Not the Workers subdomain."
}

variable "owner_emails" {
  type        = list(string)
  description = "Platform owner emails — merged into the Owners Access policy on hubs in the platform zone only. Never add customer addresses here; customer hubs would inherit them."
}

variable "support_owner_emails" {
  type        = list(string)
  default     = []
  description = "Support identities allowed into customer hubs ({site}.lovely-hub.com) alongside the household's own owners. Keep this to named operator accounts."
}

variable "sitter_emails" {
  type        = list(string)
  default     = []
  description = "Optional house-sitter emails for Access allow policies."
}

variable "github_owner" {
  type    = string
  default = "marklovely"
}

variable "github_repo" {
  type    = string
  default = "home-dashboard"
}

variable "github_production_branch" {
  type    = string
  default = "main"
}

variable "hub_proxy_secrets" {
  type        = map(string)
  sensitive   = true
  default     = {}
  description = "Per-site HUB_PROXY_SECRET overrides (CI). Prefer over sites.*.hub_proxy_secret in generated tfvars."
}

variable "customer_cloudflare_zone_id" {
  type        = string
  default     = ""
  description = "Cloudflare zone ID for customer hub hostnames (lovely-hub.com). Required when any site uses zone_name = customer_zone_name."
}

variable "customer_zone_name" {
  type        = string
  default     = "lovely-hub.com"
  description = "DNS zone for per-household hubs ({site-id}.lovely-hub.com)."
}

variable "sites" {
  type = map(object({
    hostname                              = string
    hub_environment                       = string
    vanilla                               = bool
    terraform                             = bool
    zone_name                             = optional(string)
    hub_proxy_secret                      = optional(string)
    attach_hub_api_binding                = optional(bool, true)
    include_pages_dev_access_destinations = optional(bool, true)
    access_enabled                        = optional(bool, true)
    demo_public                           = optional(bool, false)
    customer_hub                          = optional(bool)
    owner_emails                          = optional(list(string))
    sitter_emails                         = optional(list(string))
    tester_emails                         = optional(list(string))
  }))
  description = "Site registry; only sites with terraform=true are managed by this stack."
}

variable "platform_operator_emails" {
  type        = list(string)
  default     = []
  description = "Mark-only platform operator emails (Access + PLATFORM_OPERATOR_EMAILS on platform admin Pages)."
}

variable "platform_github_token" {
  type        = string
  default     = ""
  sensitive   = true
  description = "GitHub PAT for platform site wizard (contents:write, actions:write). Never commit."
}

variable "platform_cf_api_token" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Cloudflare API token with Account Read, D1 Read, R2 Read, Pages Edit, and Access Apps and Policies Edit for platform admin."
}

variable "stripe_secret_key" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Stripe TEST secret API key (sk_test_… / rk_test_…). Must be set in hub.tfvars or CI secrets or terraform apply wipes dashboard-only vars."
}

variable "stripe_webhook_secret" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Stripe TEST webhook signing secret (whsec_…) for platform /api/stripe/webhook."
}

variable "stripe_price_id" {
  type        = string
  default     = ""
  description = "Stripe TEST Price id for the monthly hub subscription (price_…)."
}

variable "stripe_price_id_yearly" {
  type        = string
  default     = ""
  description = "Stripe TEST Price id for the yearly hub subscription (price_…)."
}

variable "stripe_secret_key_live" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Stripe LIVE secret API key (sk_live_… / rk_live_…). Optional until public launch."
}

variable "stripe_webhook_secret_live" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Stripe LIVE webhook signing secret (whsec_…) for the same /api/stripe/webhook URL."
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

variable "marketing_site_origin" {
  type        = string
  default     = "https://lovely-home.co.uk"
  description = "Public marketing site origin for trial signup (lovely-home.co.uk)."
}

variable "marketing_site_access_protected" {
  type        = bool
  default     = false
  description = "When true, require Cloudflare Access OTP on lovely-home.co.uk (platform operators only). Set false at public launch."
}

variable "marketing_site_pages_name" {
  type        = string
  default     = "lovely-home"
  description = "Cloudflare Pages project name for the marketing site (Access *.pages.dev destinations)."
}

variable "public_signup_enabled" {
  type        = bool
  default     = false
  description = "Enable public trial signup API (/api/public/signup) on platform Pages."
}

variable "turnstile_site_key" {
  type        = string
  default     = ""
  description = "Cloudflare Turnstile site key for the public signup form. The bot check stays off until both Turnstile values are set."
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
  description = "Resend API key for customer lifecycle emails (signup, trial ending, payment failed, cancelled). Omit until mail is enabled."
}

variable "customer_email_from" {
  type        = string
  default     = ""
  description = "From header for customer emails, e.g. Lovely Home <support@lovely-home.co.uk>. Defaults in application code when empty."
}

variable "pages_preview_deployments_enabled" {
  type        = bool
  default     = true
  description = "When true, feature branches get Cloudflare Pages preview builds (platform admin + Terraform-managed hub sites)."
}

variable "platform_admin" {
  type = object({
    enabled    = bool
    hostname   = string
    pages_name = optional(string, "home-dashboard-platform")
  })
  default = {
    enabled    = false
    hostname   = "platform.lovely-home.co.uk"
    pages_name = "home-dashboard-platform"
  }
  description = "Operator dashboard (separate Pages project). Not a household hub site."
}
