FROM vineetk13/master-nodepty-adb as base
ARG port

# Create app directory
WORKDIR /usr/src/app
COPY package*.json ./

ENV PORT=${port}
ENV GRADLE_HOME=/opt/gradle/gradle-5.4.1
ENV ANDROID_HOME=/opt/android
ENV PATH=$PATH:$GRADLE_HOME/bin:/opt/gradlew:$ANDROID_HOME/emulator:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools


RUN apt-get update && apt-get install -y curl
RUN apt-get install -y build-essential
RUN curl --location https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs
RUN apt-get install -y aptitude
RUN aptitude install -y npm   
RUN npm update -g npm 
RUN npm cache clean --force
RUN npm install --production

# Bundle app source
COPY . ./

EXPOSE $PORT

CMD [ "node", "src/index.js" ]
