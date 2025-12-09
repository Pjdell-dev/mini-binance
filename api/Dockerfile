FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    oniguruma-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    postgresql-dev \
    linux-headers \
    $PHPIZE_DEPS

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Create non-root user
RUN addgroup -g 1000 www && \
    adduser -D -u 1000 -G www www

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY --chown=www:www . /var/www/html

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction || true

# Set permissions
RUN chown -R www:www /var/www/html/storage /var/www/html/bootstrap/cache || true

# Switch to non-root user
USER www

# Expose port
EXPOSE 9000

CMD ["php-fpm"]
