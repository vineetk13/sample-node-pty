FROM vineetk13/ubuntu-webcli:1.0.0
ARG port

# Create app directory
WORKDIR /usr/src/app
COPY package*.json ./

ENV PORT=${port}
RUN apt-get update && apt-get install -y curl
RUN apt-get install make
RUN apt-get install -y build-essential
RUN curl --location https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y nodejs
RUN apt-get install -y aptitude
RUN aptitude install -y npm   
RUN echo "Node: " && node -v
RUN npm update -g npm 
RUN npm cache clean --force
RUN npm install --production

# Bundle app source
COPY . ./

EXPOSE $PORT

CMD [ "node", "src/index.js" ]
