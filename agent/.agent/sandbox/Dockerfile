FROM node:22

RUN apt update && apt install -y \
      busybox bash \
      iptables ipset dnsmasq dnsutils \
      ripgrep fd-find jq \
      git tmux \
    && bash -c 'ln -s $(which fdfind) /usr/local/bin/fd' \
    && npm install -g npm@latest

USER node:node
