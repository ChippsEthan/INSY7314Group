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

Bycrypt Hash image needed

Bycrypt compare image needed

### JWT Authentication 
When you login successfully a JWT token will be generated containing the users ID and their role , this JWT token is then sent to the Authorization header for protected routes.

JWT sign image

JWT verify image

### Input validation
we use something called express validator to check all incoming data and make sure it is valid before we process the data, this keeps us safe from injection attacks and ensures our data's integrity.

Validation code image
