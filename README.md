# ConnectDevs

ConnectDevs is a platform for developers to connect, collaborate, and grow their professional network. The project provides features like authentication, profile management, sending and receiving connection requests, and more. It is built using Node.js, Express.js, MongoDB, and RESTful APIs.

---

## Features

- **User Authentication**: Secure login and registration using JSON Web Tokens (JWT).
- **Profile Management**: Users can edit and update their profiles.
- **Connections**: Send and manage connection requests with other developers.
- **RESTful APIs**: Backend follows RESTful principles for managing resources.
- **Database**: MongoDB for storing user data, connection requests, and profiles.

---

## Tech Stack

### Backend:

- **Node.js**: Runtime environment for executing JavaScript on the server.
- **Express.js**: Web framework for building RESTful APIs.
- **MongoDB**: NoSQL database for scalable data storage.
- **Mongoose**: ODM for MongoDB.

### Security:

- **JSON Web Token (JWT)**: Token-based authentication for securing routes.

---

## Installation and Setup

### Steps:

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/your-username/ConnectDevs.git

   ```

2. **Install Dependencies**:
   npm install

3. **Environment Variables**:
   Create a .env file in the root directory and add the following variables:

MONGODB_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>?retryWrites=true&w=majority


4. npm start


## API Endpoints


1. localhost:3001/signup
2. localhost:3001/login
3. localhost:3001/logout
4. localhost:3001/profile/view
5. localhost:3001/user/connections
6. localhost:3001/feed
7. localhost:3001/user/requests/received
8. localhost:3001/profile/edit
9. /request/send/:status/:touserId
10. /request/review/:status/:requestId
