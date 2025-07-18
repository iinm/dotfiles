FROM node:22

RUN apt update && \
  apt install -y dnsutils iptables ipset iproute2 iputils-ping netcat-openbsd && \
  npm install -g npm@latest

USER node:node
