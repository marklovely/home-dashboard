locals {
  pages_preview_deployment_setting = var.pages_preview_deployments_enabled ? "all" : "none"

  platform_d1_binding = {
    PLATFORM_BILLING_DB = {
      id = cloudflare_d1_database.platform_billing.id
    }
  }

  platform_production_env_vars = merge(
    {
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
      CLOUDFLARE_ACCOUNT_ID = {
        type  = "plain_text"
        value = var.account_id
      }
      NODE_VERSION = {
        type  = "plain_text"
        value = "24.19.0"
      }
    },
    var.platform_github_token != "" ? {
      PLATFORM_GITHUB_TOKEN = {
        type  = "secret_text"
        value = var.platform_github_token
      }
      PLATFORM_GITHUB_REPO = {
        type  = "plain_text"
        value = local.github_repo_slug
      }
    } : {},
    var.platform_cf_api_token != "" ? {
      PLATFORM_CF_API_TOKEN = {
        type  = "secret_text"
        value = var.platform_cf_api_token
      }
    } : {},
    var.stripe_secret_key != "" ? {
      STRIPE_SECRET_KEY = {
        type  = "secret_text"
        value = var.stripe_secret_key
      }
    } : {},
    var.stripe_webhook_secret != "" ? {
      STRIPE_WEBHOOK_SECRET = {
        type  = "secret_text"
        value = var.stripe_webhook_secret
      }
    } : {},
    var.stripe_price_id != "" ? {
      STRIPE_PRICE_ID = {
        type  = "plain_text"
        value = var.stripe_price_id
      }
    } : {},
    var.stripe_checkout_success_url != "" ? {
      STRIPE_CHECKOUT_SUCCESS_URL = {
        type  = "plain_text"
        value = var.stripe_checkout_success_url
      }
    } : {},
    var.stripe_checkout_cancel_url != "" ? {
      STRIPE_CHECKOUT_CANCEL_URL = {
        type  = "plain_text"
        value = var.stripe_checkout_cancel_url
      }
    } : {}
  )

  pages_runtime_base = {
    fail_open           = true
    compatibility_date  = "2024-12-01"
    compatibility_flags = ["nodejs_compat"]
  }

  pages_production_config = merge(
    local.pages_runtime_base,
    {
      env_vars     = local.platform_production_env_vars
      d1_databases = local.platform_d1_binding
    }
  )

  pages_preview_config = merge(
    local.pages_runtime_base,
    {
      env_vars     = local.platform_production_env_vars
      d1_databases = local.platform_d1_binding
    }
  )
}

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
