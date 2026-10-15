#!/bin/sh
set -eu

# Hex avoids SQL and Compose interpolation in generated database credentials.
case "$APP_DATABASE_PASSWORD" in
  ''|*[!0-9a-fA-F]*) echo 'APP_DATABASE_PASSWORD must be a random hex string' >&2; exit 1 ;;
esac
if [ "${#APP_DATABASE_PASSWORD}" -lt 32 ]; then
  echo 'APP_DATABASE_PASSWORD must contain at least 32 hex characters' >&2
  exit 1
fi

MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -u root <<SQL
CREATE USER 'zhuoruan_app'@'%' IDENTIFIED BY '$APP_DATABASE_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON zhuoruan_recruitment.* TO 'zhuoruan_app'@'%';
SQL
