FROM docker-proxy.local/node:14
# set timezone
RUN ln -snf /usr/share/zoneinfo/Asia/Almaty /etc/localtime && echo Asia/Almaty > /etc/timezone
RUN useradd -u 1025 app
USER 1025
WORKDIR /app
COPY . /app
EXPOSE 3000
CMD [ "npm", "run", "start:prod" ]
