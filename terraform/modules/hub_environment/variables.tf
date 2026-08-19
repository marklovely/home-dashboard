variable "site_id" {
  type = string
}

variable "hub_environment" {
  type = string
}

variable "hostname" {
  type = string
}

variable "vanilla" {
  type    = bool
  default = true
}

variable "account_id" {
  type = string
}

variable "zone_id" {
  type = string
}

variable "zone_name" {
  type = string
}

variable "workers_subdomain" {
  type = string
}

variable "access_team_domain" {
  type = string
}

variable "owner_emails" {
  type = list(string)
}

variable "sitter_emails" {
  type    = list(string)
  default = []
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

variable "default_latitude" {
  type    = string
  default = "51.5074"
}

variable "default_longitude" {
  type    = string
  default = "-0.1278"
}

variable "hub_proxy_secret" {
  type        = string
  default     = null
  sensitive   = true
  description = "Existing HUB_PROXY_SECRET when importing a manually provisioned site. Omit for new sites (Terraform generates one)."
}

variable "attach_hub_api_binding" {
  type        = bool
  default     = true
  description = "Bind Pages HUB_API to the site Worker. Set false for the first apply before the Worker is deployed, then true and apply again."
}

variable "platform_health_checks_enabled" {
  type        = bool
  default     = false
  description = "Allow Access service tokens on hub Pages/Worker (for platform admin health probes)."
}


locals {
  # Production was provisioned before the {site_id} suffix convention.
  worker_name       = var.site_id == "production" ? "lovely-home-hub-api" : "lovely-home-hub-api-${var.site_id}"
  pages_name        = var.site_id == "production" ? "home-dashboard" : "home-dashboard-${var.site_id}"
  d1_name           = var.site_id == "production" ? "lovely-home-appliance-manuals" : "lovely-home-appliance-manuals-${var.site_id}"
  r2_guides_name    = var.site_id == "production" ? "lovely-home-appliance-guides" : "lovely-home-appliance-guides-${var.site_id}"
  r2_media_name     = var.site_id == "production" ? "lovely-home-guide-media" : "lovely-home-guide-media-${var.site_id}"
  worker_hostname   = "${local.worker_name}.${var.workers_subdomain}.workers.dev"
  worker_api_origin = "https://${local.worker_hostname}"
  hostname_label    = replace(var.hostname, ".${var.zone_name}", "")
  # Production uses entrypoint = "default" (legacy import). Other sites: service name only (matches attach-hub-api-pages-binding.mjs).
  pages_hub_api_services = {
    HUB_API = var.site_id == "production" ? {
      service     = local.worker_name
      environment = "production"
      entrypoint  = "default"
      } : {
      service = local.worker_name
    }
  }
}
