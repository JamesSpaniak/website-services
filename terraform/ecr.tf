resource "aws_ecr_repository" "api_server" {
  name                 = "${var.project_name}-api-server"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "drone_frontend" {
  name                 = "${var.project_name}-drone-frontend"
  image_tag_mutability = "MUTABLE"
}