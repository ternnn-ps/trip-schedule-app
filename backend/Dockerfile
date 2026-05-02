FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app
COPY pom.xml .
COPY src ./src

RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:17-jre

WORKDIR /app
COPY --from=build /app/target/test-backend.war app.war

ENV PORT=8080
EXPOSE 8080

CMD ["java", "-jar", "app.war"]
