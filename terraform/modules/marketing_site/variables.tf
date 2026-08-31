variable "account_id" {
  type = string
}

variable "hostname" {
  type        = string
  description = "Marketing site hostname (e.g. lovely-home.co.uk)."
}

variable "pages_name" {
  type        = string
  default     = "lovely-home"
  description = "Cloudflare Pages project name for the marketing site."
}

variable "operator_emails" {
  type        = list(string)
  description = "Platform operator emails allowed via OTP (same as platform admin)."
}

variable "access_session_duration" {
  type    = string
  default = "720h"
}

variable "include_www" {
  type        = bool
  default     = true
  description = "Also protect www.{hostname} when the www CNAME is attached in Pages."
}

variable "pages_preview_deployments_enabled" {
  type        = bool
  default     = true
  description = "When true, include lovely-home.pages.dev and *.pages.dev preview hostnames."
}

variable "pages_dev_hostname" {
  type        = string
  default     = null
  description = "Override Cloudflare-assigned *.pages.dev hostname when it differs from the Pages project name."
}

locals {
  www_hostname   = "www.${var.hostname}"
  pages_dev_host = coalesce(var.pages_dev_hostname, "${var.pages_name}.pages.dev")
  operator_policy_includes = [
    for email in var.operator_emails : {
      email = { email = email }
    }
  ]
}
