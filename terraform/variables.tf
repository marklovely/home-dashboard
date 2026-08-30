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
  description = "Household owner emails — merged into the Owners Access policy on every managed hub."
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
  description = "Cloudflare API token with Account Read, D1 Read, and R2 Read for platform storage usage checks."
}

variable "stripe_secret_key" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Stripe secret API key for platform billing (sk_test_… or sk_live_…). Must be set in hub.tfvars or CI secrets or terraform apply wipes dashboard-only vars."
}

variable "stripe_webhook_secret" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Stripe webhook signing secret (whsec_…) for platform /api/stripe/webhook."
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

variable "marketing_site_origin" {
  type        = string
  default     = "https://lovely-home.co.uk"
  description = "Public marketing site origin for trial signup (lovely-home.co.uk)."
}

variable "public_signup_enabled" {
  type        = bool
  default     = false
  description = "Enable public trial signup API (/api/public/signup) on platform Pages."
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
