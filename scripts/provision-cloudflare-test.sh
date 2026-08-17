#!/usr/bin/env bash
# Legacy alias — prefer terraform apply or scripts/provision-hub-site.sh test
exec bash "$(dirname "$0")/provision-hub-site.sh" test
