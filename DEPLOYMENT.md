# VegBazar Backend Deployment Guide

## 1. Architecture

- **Directory on VPS**: `/opt/apps/vegbazar/backend/`
- **Container Port**: `4000` (mapped on host to `127.0.0.1:4041`)
- **Domain**: `api.vegbazar.pritesh.site`
- **Healthcheck**: `http://127.0.0.1:4041/health`

## 2. Server Setup on VPS

```bash
# Create directory structure
sudo install -d -o vegbazar-deploy -g vegbazar-deploy -m 0750 /opt/apps/vegbazar/backend
sudo install -d -o 1000 -g 1000 -m 0750 \
  /opt/apps/vegbazar/backend/data/invoices \
  /opt/apps/vegbazar/backend/data/uploads \
  /opt/apps/vegbazar/backend/data/reports
```

The deployment workflow stages each Compose/script pair as an immutable revision
and selects it under the VPS deployment lock. To roll back manually, use the
selected revision's script:

```bash
bash /opt/apps/vegbazar/backend/.deployment-current/deploy.sh rollback
```

## 3. Environment Variables

Create `/opt/apps/vegbazar/backend/.env` with production secrets:

```dotenv
DB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/VegBazarDB?retryWrites=true&w=majority
DB_NAME=VegBazarDB
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
FRONTEND_URL=https://vegbazar.pritesh.site,https://vegbazar.store
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_SECRET=your_razorpay_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
ADMIN_EMAIL=admin@example.com
```

Set permissions:

```bash
sudo chown vegbazar-deploy:vegbazar-deploy /opt/apps/vegbazar/backend/.env
sudo chmod 0600 /opt/apps/vegbazar/backend/.env
```

## 4. GHCR Image Access

The published image is
`ghcr.io/codax69/vegbazar-backend`. Ensure the `vegbazar-deploy` account can
pull the commit-tagged image: either make the package readable without
authentication, or configure valid GHCR credentials for the host's Docker
Compose account with package pull access. The workflow does not assume
anonymous access or install a particular host authentication method.

## 5. Nginx Reverse Proxy

Install `deploy/nginx/vegbazar-backend.conf` on VPS:

```bash
sudo install -m 0644 deploy/nginx/vegbazar-backend.conf /etc/nginx/sites-available/vegbazar-backend.conf
sudo ln -sf /etc/nginx/sites-available/vegbazar-backend.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
