locals {
  pages_preview_deployment_setting = var.pages_preview_deployments_enabled ? "all" : "none"

  pages_shared_env_vars = {
    WORKER_API_ORIGIN = {
      type  = "plain_text"
      value = local.worker_api_origin
    }
    VITE_DEPLOYMENT_MODE = {
      type  = "plain_text"
      value = "home"
    }
    VITE_HUB_ENVIRONMENT = {
      type  = "plain_text"
      value = var.hub_environment
    }
    CF_ACCESS_TEAM_DOMAIN = {
      type  = "plain_text"
      value = var.access_team_domain
    }
    CF_ACCESS_AUD_PAGES = {
      type  = "plain_text"
      value = cloudflare_zero_trust_access_application.pages.aud
    }
    HUB_PROXY_SECRET = {
      type  = "secret_text"
      value = local.hub_proxy_secret_value
    }
    NODE_VERSION = {
      type  = "plain_text"
      value = "24.19.0"
    }
  }

  pages_runtime_base = {
    fail_open           = true
    compatibility_date  = "2024-12-01"
    compatibility_flags = ["nodejs_compat"]
  }

  pages_deployment_with_binding = var.attach_hub_api_binding ? { services = local.pages_hub_api_services } : {}

  pages_production_config = merge(
    local.pages_runtime_base,
    { env_vars = local.pages_shared_env_vars },
    local.pages_deployment_with_binding
  )

  pages_preview_config = merge(
    local.pages_runtime_base,
    { env_vars = local.pages_shared_env_vars },
    local.pages_deployment_with_binding
  )
}

resource "cloudflare_pages_project" "dashboard" {
  account_id        = var.account_id
  name              = local.pages_name
  production_branch = var.github_production_branch

  build_config = {
    build_command   = "npm run build"
    destination_dir = "dist"
    root_dir        = ""
  }

  source = {
    type = "github"
    config = {
      owner                          = var.github_owner
      repo_name                      = var.github_repo
      production_branch              = var.github_production_branch
      production_deployments_enabled = true
      preview_deployment_setting     = local.pages_preview_deployment_setting
    }
  }

  deployment_configs = {
    production = local.pages_production_config
    preview    = local.pages_preview_config
  }
}

resource "cloudflare_pages_domain" "custom" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.dashboard.name
  name         = var.hostname
}

resource "cloudflare_dns_record" "pages" {
  zone_id = var.zone_id
  name    = local.hostname_label
  type    = "CNAME"
  content = cloudflare_pages_project.dashboard.subdomain
  proxied = true
  ttl     = 1
  comment = "Lovely Home Hub ${var.site_id} (managed by Terraform)"
}
