locals {
  hub_provision_queue_name = "lovely-home-hub-provision"
  hub_registry_queue_name  = "lovely-home-hub-registry"
}

resource "cloudflare_queue" "hub_provision_dlq" {
  account_id = var.account_id
  queue_name = "${local.hub_provision_queue_name}-dlq"
}

resource "cloudflare_queue" "hub_registry_dlq" {
  account_id = var.account_id
  queue_name = "${local.hub_registry_queue_name}-dlq"
}

resource "cloudflare_queue" "hub_provision" {
  account_id = var.account_id
  queue_name = local.hub_provision_queue_name
}

resource "cloudflare_queue" "hub_registry" {
  account_id = var.account_id
  queue_name = local.hub_registry_queue_name
}

resource "cloudflare_queue_consumer" "hub_provision" {
  account_id        = var.account_id
  queue_id          = cloudflare_queue.hub_provision.id
  script_name       = cloudflare_workers_script.hub_jobs.script_name
  type              = "worker"
  dead_letter_queue = cloudflare_queue.hub_provision_dlq.queue_name
  settings = {
    batch_size            = 1
    max_concurrency       = 4
    max_retries           = 5
    max_wait_time_ms      = 500
    retry_delay           = 30
    visibility_timeout_ms = 60000
  }
}

resource "cloudflare_queue_consumer" "hub_registry" {
  account_id        = var.account_id
  queue_id          = cloudflare_queue.hub_registry.id
  script_name       = cloudflare_workers_script.hub_jobs.script_name
  type              = "worker"
  dead_letter_queue = cloudflare_queue.hub_registry_dlq.queue_name
  settings = {
    batch_size            = 1
    max_concurrency       = 1
    max_retries           = 8
    max_wait_time_ms      = 500
    retry_delay           = 30
    visibility_timeout_ms = 900000
  }
}
