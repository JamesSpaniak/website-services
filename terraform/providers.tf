terraform {
  # use_lockfile (native S3 state locking) needs 1.10+.
  required_version = ">= 1.10"

  # Values here are the droneedge-dev defaults so a bare `terraform init` still
  # works. pipeline.sh always passes -backend-config=key=... derived from the
  # project_name in the tfvars actually in use, so `--env prod` cannot land in
  # the dev state. See scripts/ensure-state-backend.sh.
  backend "s3" {
    bucket       = "droneedge-tfstate-956463123464"
    key          = "droneedge-dev/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}