FROM hayd/deno:latest
EXPOSE 8004
WORKDIR /app
COPY ./server/ /app/
RUN deno cache haikupotamus.js
CMD ["run", "--allow-net", "--allow-read", "haikupotamus.js"]