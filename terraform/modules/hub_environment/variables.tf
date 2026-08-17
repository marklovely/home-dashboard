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

variable "attach_worker_service_binding" {
  type        = bool
  default     = false
  description = "Set true only after the site Worker exists (wrangler deploy). Pages rejects HUB_API binding to a missing Worker."
}

locals {
  worker_name       = "lovely-home-hub-api-${var.site_id}"
  pages_name        = "home-dashboard-${var.site_id}"
  d1_name           = "lovely-home-appliance-manuals-${var.site_id}"
  r2_guides_name    = "lovely-home-appliance-guides-${var.site_id}"
  r2_media_name     = "lovely-home-guide-media-${var.site_id}"
  worker_hostname   = "${local.worker_name}.${var.workers_subdomain}.workers.dev"
  worker_api_origin = "https://${local.worker_hostname}"
  hostname_label    = replace(var.hostname, ".${var.zone_name}", "")
}
