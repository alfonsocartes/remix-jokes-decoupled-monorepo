# Node API + Prisma + Typescript + Elastic Beanstalk

This project is a sample but complete implementation of a Node Backend deployed in Elastic Beanstalk and RDS using the Remix Jokes example

- Typescript
- Auth Server (JWT with Access and Refresh tokens)
- Redis Server (for refresh tokens blacklist)
- Authenticated routes.
- Prisma
- PostgreSQL DB
- Elastic Beanstalk + RDS deployment (boring and proven)

## Deployment steps

- Create a new environment in the AWS Elastic Beanstalk website
- eb init
- eb deploy and select the environment created in the website
- Create new Postgres RDS in the website
- Create permission for RDS. Take a look at: **Allow external connections on inbound rules of the security group of the RDS database**
- Create a new database. In this example "jokesdb" with pgAdmin or psql
- prisma db push
- Seed the database?
- Set environment variables

## Things to take into account for this deployment:

### Config files in .ebextension:

- **npm_production.config:**
  By default, Elastic Beanstalk installs dependencies in production mode (npm install --production). If you want to install development dependencies on your environment instances, set the NPM_USE_PRODUCTION environment property to false.

- **redis.config:**

Install Redis in Elastic Beanstalk. They make it hard, I guess to make you use ElastiCache. You can also use ElastiCache with Redis.

- **source_compile.config:**

Compilation step to compile the app from Typescript to Javascript to run it in NodeJS

**Important Note:** The node version in the path in the file PATH: /opt/elasticbeanstalk/node-install/node-v16.14.0-linux-x64/bin/ should match the Node engine version in package.json. That node version should be supported by Elastic Beanstalk: [Supported Node Versions](https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/platforms-supported.html#platforms-supported.nodejs)

#### Allow external connections on inbound rules of the security group of the RDS database\*\*

To connect to the RDS database from localhost we need to allow external connections in the inbound rules of the security group for postgres:
In the RDS console: Databases > Database > Security group ID > Edit inbound rules > Delete the current Security group rule and add another one: Type: PostgreSQL, Source Anywhere

Also, the database needs to be publicly accessible:

To change the Publicly Accessible property of the Amazon RDS instance to Yes:

1.  Verify that your VPC has an internet gateway attached to it. Make sure that the inbound rules for the security group allow connections.

2.  Open the Amazon RDS console.

3.  Choose Databases from the navigation pane, and then select the DB instance.

4.  Choose Modify.

5.  Under Connectivity, extend the Additional configuration section, and then choose Publicly accessible.

6.  Choose Continue.

7.  Choose Modify DB Instance.

#### How to migrate and seed the database

From localhost we can migrate the database with Prisma after setting up the RDS URL as the DATABASE variable on the .env file.

Ideally, migrate deploy should be part of an automated CI/CD pipeline, and we do not generally recommend running this command locally to deploy changes to a production database (for example, by temporarily changing the DATABASE_URL environment variable). It is not generally considered good practice to store the production database URL locally.

- Prisma Migrate: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Seed database: https://www.prisma.io/docs/guides/database/seed-database

#### ENV Variables

Remember to set up the variables in the .env file in Elastic Beanstalk

### CI/CD

There are actions already set up for GitHub workers to deploy both to a staging environment and a production environment every time we push (and merge pull requests) to the "staging" branch or the "master" (production) branch.

Path: .github/workflows/[staging | production].yml

The process has three steps:

- Checking step: check linting and check typescript
- Build step: build the app and deploys the prisma migration
- Deployment step: deploys the application to Elastic Beanstalk.

#### CI/CD Setup

**Elastic Beanstalk configuration in yml files**

Path: .github/workflows/[staging | production].yml

- application_name: application name
- environment_name: environment name
- region: region

**GitHub Secrets**

- DATABASE_URL_STAGING: postgres URL used by Prisma for the Staging environment
- DATABASE_URL_PROD: postgres URL used by Prisma for the PRODUCTION environment
- AWS_ACCESS_KEY_ID: for Elastic Beanstalk deployment
- AWS_SECRET_ACCESS_KEY: for Elastic Beanstalk deployment
