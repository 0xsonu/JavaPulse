FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY java-executor/pom.xml .
RUN apt-get update && apt-get install -y maven
RUN mvn dependency:go-offline

COPY java-executor/src ./src
RUN mvn clean package -DskipTests

CMD ["java", "-jar", "target/java-executor.jar"]
