locals {
  hub_jobs_script_path = "${path.module}/../../../workers/hub-jobs/index.js"
  hub_jobs_bindings = concat(
    [
      {
        name = "PLATFORM_GITHUB_REPO"
        type = "plain_text"
        text = local.github_repo_slug
      },
      {
        name = "PLATFORM_GITHUB_REF"
        type = "plain_text"
        text = var.github_production_branch
      }
    ],
    var.platform_github_token != "" ? [
      {
        name = "PLATFORM_GITHUB_TOKEN"
        type = "secret_text"
        text = var.platform_github_token
      }
    ] : []
  )
}

resource "cloudflare_workers_script" "hub_jobs" {
  account_id          = var.account_id
  script_name         = "lovely-home-hub-jobs"
  main_module         = "index.js"
  content             = file(local.hub_jobs_script_path)
  compatibility_date  = "2026-09-03"
  compatibility_flags = ["nodejs_compat"]

  observability = {
    enabled = true
    logs = {
      enabled         = true
      invocation_logs = true
    }
  }

  bindings = local.hub_jobs_bindings
}
