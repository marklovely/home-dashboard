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
  description = "Zero Trust team slug only (e.g. mark-lovely67), not the full cloudflareaccess.com URL."
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
    hostname        = string
    hub_environment = string
    vanilla         = bool
    terraform       = bool
  }))
  description = "Site registry; only sites with terraform=true are managed by this stack."
}
