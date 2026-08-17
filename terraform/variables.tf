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
  description = "Owner emails allowed through Cloudflare Access."
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

variable "sites" {
  type = map(object({
    hostname               = string
    hub_environment        = string
    vanilla                = bool
    terraform              = bool
    hub_proxy_secret       = optional(string)
    attach_hub_api_binding = optional(bool, true)
  }))
  description = "Site registry; only sites with terraform=true are managed by this stack."
}

variable "platform_operator_emails" {
  type        = list(string)
  default     = []
  description = "Mark-only platform operator emails (Access + PLATFORM_OPERATOR_EMAILS on platform admin Pages)."
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
