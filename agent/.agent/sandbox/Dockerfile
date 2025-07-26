FROM node:22

RUN apt update && apt install -y \
      busybox bash \
      iptables ipset dnsmasq dnsutils \
      ripgrep fd-find \
      git \
    && bash -c '$(which fdfind) /usr/local/bin/fd' \
    && npm install -g npm@latest

USER node:node
