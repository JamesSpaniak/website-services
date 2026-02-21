# =============================================================================
# Email DNS Records for thedroneedge.com
#
# SPF, DMARC, and MX are managed by terraform.
# DKIM is managed manually in Route53 console (see bottom of file).
# =============================================================================

# --- SPF Record ---
resource "aws_route53_record" "spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 3600
  records = [
    "v=spf1 include:_spf.google.com ip4:${aws_eip.nat.public_ip} ~all"
  ]
}

# --- DMARC Record ---
resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 3600
  records = [
    "v=DMARC1; p=quarantine; rua=mailto:${var.admin_email}; pct=100; adkim=r; aspf=r"
  ]
}

# --- MX Records (Google Workspace) ---
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 3600
  records = [
    "1 ASPMX.L.GOOGLE.COM",
    "5 ALT1.ASPMX.L.GOOGLE.COM",
    "5 ALT2.ASPMX.L.GOOGLE.COM",
    "10 ALT3.ASPMX.L.GOOGLE.COM",
    "10 ALT4.ASPMX.L.GOOGLE.COM",
  ]
}

# --- DKIM ---
# Managed via Route53 console as a single TXT record with two character strings.
# The terraform AWS provider double-quotes values, preventing multi-string TXT records.
#
# Record name:  google._domainkey.thedroneedge.com
# Record type:  TXT
# TTL:          3600
# Value (two quoted chunks, single space between):
#   "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2dhejV2b2AEEQRzSeIeRNobtVq3ZD3znOYPfKKuPlsp+A3AnlSpVxFnLgZ8J5LcpEFLjyj4OpWj4wjezptsRCjFo/E4xFabnbBsqEP4nPJKQVpMHH0IyN6ptATa0MIYet2hbbWlBCIPS/g9MTaQ9VjIvwBMQYQDdHTi" "r+/Rqv/PdbKDVuYYeHer5ufNz/2yDQil/OPCY7+HUjY16DHNTHYT0HkUCKd0PzGVp8jCMPDb+BdyuBQ1aOQUUx5u8UEkUNqUmg+bJPYpVaoDY11kNhz108VhoEa/NSRNjOguUGMpgYREANxmGmk4tUG1Y4ostFsLWisWE5UjsR80Rv/k6vwIDAQAB"
#
# Source: Google Admin Console -> Apps -> Gmail -> Authenticate email -> thedroneedge.com
# After creating in Route53, click "Start authentication" in Google Admin.
