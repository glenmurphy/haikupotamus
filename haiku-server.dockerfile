FROM hayd/deno:latest
EXPOSE 8004
WORKDIR /app
COPY ./server/ /app/
RUN deno cache haiku.js
CMD ["run", "--allow-net", "--allow-read", "haiku.js"]