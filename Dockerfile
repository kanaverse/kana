FROM ubuntu:latest
ARG UID=1001
ARG GID=1001

RUN apt-get update && \
    apt-get install -y curl

RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
RUN curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | tee /usr/share/keyrings/yarnkey.gpg >/dev/null
RUN echo "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && \
	apt-get install -y yarn

# Expose the app port
EXPOSE 3000

# Set up the user and directories
RUN groupadd -g ${GID} kana
RUN useradd -rm -d /home/kana -s /bin/bash -g ${GID} -G sudo -u ${UID} kana

USER kana

WORKDIR /home/kana

# Start the app
#CMD yarn && yarn start

# Build a static version of the app for deployment
CMD yarn && PUBLIC_URL="/kana" yarn build
