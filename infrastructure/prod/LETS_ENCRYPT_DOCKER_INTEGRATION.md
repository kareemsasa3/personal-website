# 🔐 Let's Encrypt Docker Compose Integration

## 🎯 Overview

This document describes the advanced Let's Encrypt SSL certificate integration with Docker Compose, providing **zero-downtime certificate renewal** and **fully automated SSL management**.

## 🏗️ Architecture

### Service Integration
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Certbot       │    │     Nginx       │    │   ACME Challenge│
│   Service       │◄──►│   Reverse Proxy │◄──►│   Files         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  /etc/letsencrypt│    │  /var/www/certbot│   │  SSL Certificates│
│  (Certificates)  │    │  (Challenge Dir) │   │  (Production)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Volume Sharing
- **Certbot** ↔ **Nginx**: Shared access to SSL certificates
- **Nginx** ↔ **ACME Challenge**: Webroot verification files
- **Persistent Storage**: Certificate renewal across container restarts

## 🚀 Key Benefits

### 1. Zero-Downtime Renewal
- ✅ No service interruption during certificate renewal
- ✅ Automatic certificate copying and nginx reload
- ✅ Seamless user experience

### 2. Full Automation
- ✅ Automatic initial certificate setup
- ✅ Scheduled renewal via cron
- ✅ Error handling and logging
- ✅ No manual intervention required

### 3. Security
- ✅ Proper file permissions (600 for keys, 644 for certs)
- ✅ Secure ACME challenge handling
- ✅ No certificate exposure in logs

### 4. Scalability
- ✅ Easy to add multiple domains
- ✅ Supports wildcard certificates
- ✅ Works with any Docker Compose setup

## 📁 File Structure

```
infrastructure/
├── prod/
│   ├── docker-compose.prod.yml      # Production config with certbot
│   ├── lets-encrypt-setup.sh        # Automated setup script
│   └── LETS_ENCRYPT_DOCKER_INTEGRATION.md
├── nginx/
│   ├── conf.d/
│   │   └── default.conf             # Updated with ACME challenge
│   ├── ssl/                         # SSL certificates
│   │   ├── cert.pem
│   │   └── key.pem
│   └── certbot/
│       └── www/                     # ACME challenge files
├── logs/
│   └── certbot/                     # Certbot logs
└── renew-ssl.sh                     # Auto-renewal script
```

## 🔧 Configuration Details

### Docker Compose Services

#### Certbot Service
```yaml
certbot:
  image: certbot/certbot:latest
  volumes:
    - ../nginx/ssl:/etc/letsencrypt          # Certificate storage
    - ../nginx/certbot/www:/var/www/certbot  # ACME challenge files
    - ./logs/certbot:/var/log/letsencrypt   # Logs
  command: certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email --force-renewal -d your-domain.com
  profiles:
    - ssl-setup  # Only runs when needed
  depends_on:
    - nginx
  restart: "no"
```

#### Nginx Service (Updated)
```yaml
nginx:
  volumes:
    - ../nginx/ssl:/etc/nginx/ssl:ro         # SSL certificates
    - ../nginx/certbot/www:/var/www/certbot:ro # ACME challenge files
  # ... other configuration
```

### Nginx Configuration

#### HTTP Server (ACME Challenge)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # ACME Challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files $uri =404;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}
```

#### HTTPS Server
```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # ... rest of configuration
}
```

## 🛠️ Usage

### Initial Setup

#### Automated Setup (Recommended)
```bash
cd infrastructure/prod
./lets-encrypt-setup.sh
```

The script will:
1. Prompt for domain and email
2. Create necessary directories
3. Update configuration files
4. Set up initial certificates
5. Configure auto-renewal
6. Test the setup

#### Manual Setup
```bash
# 1. Create directories
mkdir -p infrastructure/nginx/certbot/www
mkdir -p infrastructure/logs/certbot

# 2. Update configurations
sed -i 's/your-domain.com/your-actual-domain.com/g' infrastructure/prod/docker-compose.prod.yml
sed -i 's/your-email@example.com/your-actual-email@example.com/g' infrastructure/prod/docker-compose.prod.yml

# 3. Start nginx for ACME challenge
cd infrastructure
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml up -d nginx

# 4. Obtain certificate
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml --profile ssl-setup run --rm certbot

# 5. Start full stack
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml up -d
```

### Certificate Renewal

#### Automatic Renewal
```bash
# Add to crontab
crontab -e
# Add: 0 12 * * * /path/to/your/project/renew-ssl.sh
```

#### Manual Renewal
```bash
./renew-ssl.sh
```

### Management Commands

#### View Logs
```bash
# All services
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml logs -f

# Certbot only
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml logs certbot

# Nginx only
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml logs nginx
```

#### Check Certificate Status
```bash
# Certificate expiration
openssl x509 -in infrastructure/nginx/ssl/cert.pem -noout -dates

# Certificate details
openssl x509 -in infrastructure/nginx/ssl/cert.pem -noout -text

# Test SSL connection
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

#### Restart Services
```bash
# Restart all services
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml restart

# Restart nginx only
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml restart nginx
```

## 🔍 Troubleshooting

### Common Issues

#### 1. ACME Challenge Fails
```bash
# Check if nginx is serving challenge files
curl http://your-domain.com/.well-known/acme-challenge/test

# Check nginx logs
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml logs nginx

# Verify domain points to server
nslookup your-domain.com
```

#### 2. Certificate Renewal Fails
```bash
# Check certbot logs
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml logs certbot

# Manual renewal test
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml --profile ssl-setup run --rm certbot renew --dry-run
```

#### 3. Nginx SSL Errors
```bash
# Test nginx configuration
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml exec nginx nginx -t

# Check certificate permissions
ls -la infrastructure/nginx/ssl/

# Verify certificate and key match
openssl x509 -noout -modulus -in infrastructure/nginx/ssl/cert.pem | openssl md5
openssl rsa -noout -modulus -in infrastructure/nginx/ssl/key.pem | openssl md5
```

#### 4. Permission Issues
```bash
# Fix certificate permissions
chmod 600 infrastructure/nginx/ssl/key.pem
chmod 644 infrastructure/nginx/ssl/cert.pem

# Fix directory permissions
chmod 700 infrastructure/nginx/ssl/
chmod 755 infrastructure/nginx/certbot/www/
```

### Debug Commands

#### Test ACME Challenge
```bash
# Create test file
echo "test" > infrastructure/nginx/certbot/www/test

# Test access
curl http://your-domain.com/.well-known/acme-challenge/test

# Clean up
rm infrastructure/nginx/certbot/www/test
```

#### Test Certificate Renewal
```bash
# Dry run renewal
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml --profile ssl-setup run --rm certbot renew --dry-run

# Force renewal
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml --profile ssl-setup run --rm certbot renew --force-renewal
```

#### Check Service Health
```bash
# Check all services
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml ps

# Check specific service
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml ps nginx
```

## 🔒 Security Considerations

### File Permissions
- **Private Key**: 600 (owner read/write only)
- **Certificate**: 644 (owner read/write, group/others read)
- **Directories**: 700 (owner read/write/execute only)

### Network Security
- **ACME Challenge**: Only accessible via HTTP (port 80)
- **HTTPS**: All production traffic
- **Internal Communication**: Docker network isolation

### Certificate Security
- **Automatic Renewal**: Prevents certificate expiration
- **Secure Storage**: Certificates stored in Docker volumes
- **No Log Exposure**: Sensitive data not logged

## 📊 Monitoring

### Certificate Monitoring
```bash
# Check expiration dates
openssl x509 -in infrastructure/nginx/ssl/cert.pem -noout -dates

# Monitor renewal logs
tail -f infrastructure/logs/certbot/letsencrypt.log
```

### Service Monitoring
```bash
# Health checks
curl -k https://your-domain.com/health

# SSL certificate info
echo | openssl s_client -connect your-domain.com:443 -servername your-domain.com 2>/dev/null | openssl x509 -noout -subject -dates
```

### Log Monitoring
```bash
# Real-time logs
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml logs -f

# Error logs only
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml logs --tail=100 | grep -i error
```

## 🎯 Best Practices

### 1. Regular Monitoring
- Monitor certificate expiration dates
- Check renewal logs regularly
- Test SSL configuration periodically

### 2. Backup Strategy
- Backup SSL certificates and keys
- Backup configuration files
- Document renewal procedures

### 3. Security Updates
- Keep Docker images updated
- Monitor security advisories
- Regular security audits

### 4. Performance Optimization
- Use HTTP/2 for better performance
- Optimize SSL cipher suites
- Monitor SSL handshake performance

## 🚀 Advanced Features

### Multiple Domains
```yaml
# In docker-compose.prod.yml
certbot:
  command: certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email --force-renewal -d domain1.com -d domain2.com -d www.domain1.com
```

### Wildcard Certificates
```yaml
# Requires DNS challenge instead of HTTP challenge
certbot:
  command: certonly --manual --preferred-challenges=dns --email your-email@example.com --agree-tos --no-eff-email --force-renewal -d *.your-domain.com
```

### Staging Environment
```yaml
# Use Let's Encrypt staging server for testing
certbot:
  command: certonly --webroot --webroot-path=/var/www/certbot --staging --email your-email@example.com --agree-tos --no-eff-email --force-renewal -d your-domain.com
```

## 📚 Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [ACME Protocol](https://tools.ietf.org/html/rfc8555)

## ✅ Checklist

- [ ] Domain points to server IP
- [ ] Docker and Docker Compose installed
- [ ] Directories created with proper permissions
- [ ] Configuration files updated
- [ ] Initial certificate obtained
- [ ] Services running with HTTPS
- [ ] Auto-renewal configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Security audit completed

---

**This Docker Compose integration provides enterprise-grade SSL certificate management with zero downtime and full automation. Your production deployment is now ready for the world! 🌍** 