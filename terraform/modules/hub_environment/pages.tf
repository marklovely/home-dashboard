resource "cloudflare_pages_project" "dashboard" {
  account_id        = var.account_id
  name              = local.pages_name
  production_branch = var.github_production_branch

  build_config = {
    build_command   = "npm run build && node scripts/prune-hub-pages-functions.mjs"
    destination_dir = "dist"
    root_dir        = ""
  }

  source = {
    type = "github"
    config = {
      owner                         = var.github_owner
      repo_name                     = var.github_repo
      production_branch             = var.github_production_branch
      # Wrangler deploys the hub at provision (and CI deploys on app-code changes).
      # Git production deploys on every sites.yaml merge rebuild every hub and starve
      # the platform Pages project that serves signup hub-status.
      production_deployments_enabled = false
      # Hub site previews are enabled via scripts/enable-hub-pages-previews.mjs — Terraform
      # PATCH of preview + HUB_API bindings returns Cloudflare 8000022 for non-production Workers.
      preview_deployment_setting = "none"
    }
  }

  deployment_configs = {
    production = {
      fail_open           = true
      compatibility_date  = "2024-12-01"
      compatibility_flags = ["nodejs_compat"]
      env_vars = merge(
        {
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
          HUB_PROXY_SECRET = {
            type  = "secret_text"
            value = local.hub_proxy_secret_value
          }
          NODE_VERSION = {
            type  = "plain_text"
            value = "24.19.0"
          }
        },
        var.access_enabled ? {
          CF_ACCESS_TEAM_DOMAIN = {
            type  = "plain_text"
            value = var.access_team_domain
          }
          CF_ACCESS_AUD_PAGES = {
            type  = "plain_text"
            value = cloudflare_zero_trust_access_application.pages[0].aud
          }
          } : {
          DEMO_PUBLIC = {
            type  = "plain_text"
            value = "true"
          }
        }
      )
      # HUB_API service binding is attached via scripts/attach-hub-api-pages-binding.mjs
      # (Terraform provider returns 8000022 / unknown environment on PATCH).
    }
    preview = {
      fail_open           = true
      compatibility_date  = "2024-12-01"
      compatibility_flags = ["nodejs_compat"]
    }
  }

  lifecycle {
    ignore_changes = [deployment_configs, source]
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
