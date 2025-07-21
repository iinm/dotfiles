FROM node:22

RUN apt update && apt install -y \
      bash \
      iptables ipset iproute2 dnsmasq \
      dnsutils iputils-ping netcat-openbsd \
      curl \
      git \
    && npm install -g npm@latest

USER node:node
