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

variable "pages_preview_deployments_enabled" {
  type        = bool
  default     = true
  description = "When true, non-production branches get Cloudflare Pages preview builds with the same env vars as production."
}

locals {
  hostname_label = replace(var.hostname, ".${var.zone_name}", "")
  operator_policy_includes = [
    for email in var.operator_emails : {
      email = { email = email }
    }
  ]
  operator_emails_csv = join(",", var.operator_emails)
  github_repo_slug    = "${var.github_owner}/${var.github_repo}"
}
