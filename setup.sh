#!/bin/bash
# Script de setup VPS Hetzner CX11 (Ubuntu 22.04)
# Usage : bash setup.sh

set -e

echo "🔧 Mise à jour du système..."
apt-get update && apt-get upgrade -y

echo "🐳 Installation de Docker..."
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
systemctl enable docker
systemctl start docker

echo "📁 Création de la structure certbot..."
mkdir -p certbot/conf certbot/www

echo ""
echo "✅ Setup terminé. Prochaines étapes :"
echo ""
echo "1. Pousse ton repo sur le serveur :"
echo "   git clone <ton-repo-url> ."
echo ""
echo "2. Crée le fichier backend/.env avec les valeurs de prod :"
echo "   nano backend/.env"
echo ""
echo "3. Remplace 'api.tondomaine.com' dans nginx/nginx.conf par ton domaine"
echo ""
echo "4. Lance d'abord en HTTP pour obtenir le certificat SSL :"
echo "   docker compose up -d nginx certbot"
echo "   docker compose run --rm certbot certonly --webroot \\"
echo "     --webroot-path /var/www/certbot \\"
echo "     --email ton@email.com \\"
echo "     --agree-tos --no-eff-email \\"
echo "     -d api.tondomaine.com"
echo ""
echo "5. Lance tout :"
echo "   docker compose up -d"
echo ""
echo "6. Vérifie les logs :"
echo "   docker compose logs -f backend"
