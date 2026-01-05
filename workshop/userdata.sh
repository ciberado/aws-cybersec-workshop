#!/bin/sh
 
sudo apt update
sudo apt install openjdk-17-jre-headless -y
wget https://github.com/ciberado/pokemon-java/releases/download/v2.0.0/pokemon-2.0.0.jar
java -jar pokemon-2.0.0.jar

