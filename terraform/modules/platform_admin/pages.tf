resource "cloudflare_pages_project" "admin" {
  account_id        = var.account_id
  name              = var.pages_name
  production_branch = var.github_production_branch

  build_config = {
    build_command   = "npm run build:platform"
    destination_dir = "dist-platform"
    root_dir        = ""
  }

  source = {
    type = "github"
    config = {
      owner                          = var.github_owner
      repo_name                      = var.github_repo
      production_branch              = var.github_production_branch
      production_deployments_enabled = true
      preview_deployment_setting     = "none"
    }
  }

  deployment_configs = {
    production = {
      fail_open           = true
      compatibility_date  = "2024-12-01"
      compatibility_flags = ["nodejs_compat"]
      env_vars = {
        CF_ACCESS_TEAM_DOMAIN = {
          type  = "plain_text"
          value = var.access_team_domain
        }
        CF_ACCESS_AUD_PAGES = {
          type  = "plain_text"
          value = cloudflare_zero_trust_access_application.platform.aud
        }
        PLATFORM_OPERATOR_EMAILS = {
          type  = "plain_text"
          value = local.operator_emails_csv
        }
        PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID = {
          type  = "plain_text"
          value = cloudflare_zero_trust_access_service_token.platform_health.client_id
        }
        PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET = {
          type  = "secret_text"
          value = cloudflare_zero_trust_access_service_token.platform_health.client_secret
        }
        NODE_VERSION = {
          type  = "plain_text"
          value = "22"
        }
      }
    }
    preview = {
      fail_open           = true
      compatibility_date  = "2024-12-01"
      compatibility_flags = ["nodejs_compat"]
    }
  }
}

resource "cloudflare_pages_domain" "custom" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.admin.name
  name         = var.hostname
}

resource "cloudflare_dns_record" "platform" {
  zone_id = var.zone_id
  name    = local.hostname_label
  type    = "CNAME"
  content = cloudflare_pages_project.admin.subdomain
  proxied = true
  ttl     = 1
  comment = "Lovely Home platform admin (managed by Terraform)"
}
