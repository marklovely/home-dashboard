# Authenticates via CLOUDFLARE_API_TOKEN in the environment (recommended).
# The provider does not read CLOUDFLARE_API_TOKEN when api_token is set on a variable
# that Terraform prompts for — leave this block empty.
provider "cloudflare" {}
