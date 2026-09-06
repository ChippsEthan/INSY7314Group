# HustleHub+ Freelance marletplace

## Table of content
  System overview.
  
  System architecture. 
  
  Backend Structure. 
  
  Security Implementation. 
  
  Setup. 
  
  API documentation. 
  
  Postman testing. 
  
  Demonstration video. 
  
  Contributions. 
  
  ## System Overview
  **HustleHub+** is a safe and secure marketplace for freelancers. this is part 1 of the platform which will be focusing on the secure backend foundation.

  The marketplace users would be Clients , Freelancers and admins on the platform.
  Our Current functionality is User registration, a secure Login in (JWT), and a protected route demonstartion.

## System Architecture
The system follows the MERN architecture. MongoDB will be used during our part 2 as we are are currently storing user data in memory.

#Diagram#

The Request flow moves as follows: Client to HTTPS to Express Routes to the validation to Controller to a response.

## Backend Structure
At the moment our code is structured as follows. The controllers deal with the Login logic and the registration of users , The middleware is where our JWT verification validation and error handling is , the models currently store our users in memory data and the routes define our API endpoints for the platform.

## Security Implementation

### Password Hashing
We do not store our passwords in plain text we use bcrypt with 10 salt rounds *

<img width="850" height="269" alt="image" src="https://github.com/user-attachments/assets/1ab204ae-28ea-455c-bd5f-f44fc6f7cb89" />


<img width="903" height="172" alt="image" src="https://github.com/user-attachments/assets/6dc423f9-f1ae-40be-b626-6d37d4de07ce" />


### JWT Authentication 
When you login successfully a JWT token will be generated containing the users ID and their role , this JWT token is then sent to the Authorization header for protected routes.

<img width="668" height="199" alt="image" src="https://github.com/user-attachments/assets/9ffad78d-8a63-4f45-a9c4-ed5a7030903d" />


<img width="940" height="628" alt="image" src="https://github.com/user-attachments/assets/c1e26cf1-2cc2-4e5d-a6dd-b61749c80da7" />


### Input validation
we use something called express validator to check all incoming data and make sure it is valid before we process the data, this keeps us safe from injection attacks and ensures our data's integrity.

<img width="940" height="584" alt="image" src="https://github.com/user-attachments/assets/5c34b977-7e1c-427f-a49c-0461610635bc" />

<img width="902" height="564" alt="image" src="https://github.com/user-attachments/assets/1f731595-68b5-4d35-bd1e-95b7161f2cbf" />

<img width="940" height="323" alt="image" src="https://github.com/user-attachments/assets/3a56ff1e-aa9c-4c70-aba9-90b3f5416712" />

<img width="940" height="466" alt="image" src="https://github.com/user-attachments/assets/bbc8f1d1-acf9-414c-8891-5fc591361dee" />


### Secure Error Handling
we have a global error handler that will catch all exceptions this will return a slandered JSON response without giving away our file paths , configuration values or our stack traces.

<img width="940" height="233" alt="image" src="https://github.com/user-attachments/assets/8a5efa82-32b4-457f-9a5d-29a5e32467f2" />

<img width="940" height="377" alt="image" src="https://github.com/user-attachments/assets/7b795cc0-1d5e-47a7-a50d-7218730d6f97" />

<img width="940" height="143" alt="image" src="https://github.com/user-attachments/assets/016e1dbd-0c48-4d2c-bbb3-e47ce8f04e7e" />




## Setup Instructions

### Prerequisites
Node.js v16+

npm

OpenSSL

### Installation
Clone the repo open bash: git clone https://github.com/ChippsEthan/INSY7314Group.git , then cd hustlehub-backend


#### installing the dependencies
Bash

npm install


#### create a .env file

env 

PORT=5000
JWT_SECRET=GNul9gJjBlmcqYvUkcLWMqEGO19U2AYh
SALT_ROUNDS=10
NODE_ENV=development


#### Generate the SSL certificate

bash

openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes


#### Start the server
bash

npm start

Https://localhost:5000.

## API Documentation
*
