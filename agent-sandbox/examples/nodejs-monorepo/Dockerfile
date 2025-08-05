FROM node:22

RUN apt update && apt install -y \
      busybox bash \
      iptables ipset dnsmasq dnsutils \
      ripgrep fd-find \
      curl git locales \
    && bash -c 'ln -s $(which fdfind) /usr/local/bin/fd' \
    && echo 'en_US.UTF-8 UTF-8' >> /etc/locale.gen \
    && echo 'ja_JP.UTF-8 UTF-8' >> /etc/locale.gen \
    && locale-gen \
    && npm install -g npm@latest

USER node:node
